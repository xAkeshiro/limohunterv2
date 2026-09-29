import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';

/**
 * Postgres access for the whole app.
 *
 * - DATABASE_URL (or POSTGRES_URL, which the Vercel Supabase integration
 *   sets) connects to a hosted Postgres such as Supabase or Neon.
 * - Without one, PGlite (real Postgres compiled to WebAssembly) runs in-process
 *   so local development and tests need no server. On Vercel that copy lives
 *   in /tmp and resets, so production must set a connection string.
 *
 * On first use the schema is created and, once per database, sample inventory
 * is loaded (see bootstrap below), so a fresh database needs no manual setup.
 */

export type Row = Record<string, unknown>;
export type Params = unknown[] | Record<string, unknown>;

export interface RunResult {
  rowCount: number;
  rows: Row[];
}

export interface Db {
  /** First row, or undefined. */
  get<T = Row>(sql: string, params?: Params): Promise<T | undefined>;
  all<T = Row>(sql: string, params?: Params): Promise<T[]>;
  run(sql: string, params?: Params): Promise<RunResult>;
  /** Several statements at once, no parameters (schema, truncation). */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export type DbMode = 'postgres' | 'pglite';

export function connectionString(): string | null {
  const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '').trim();
  return url || null;
}

export function dbMode(): DbMode {
  return connectionString() ? 'postgres' : 'pglite';
}

/** True when data will not survive a restart: no hosted database on a serverless host. */
export function isEphemeral(): boolean {
  return dbMode() === 'pglite' && Boolean(process.env.VERCEL);
}

/* --------------------------------------------------------- placeholders */

/**
 * The code writes `?` (positional) or `@name` (with an object) placeholders;
 * Postgres wants $1, $2… Quoted literals are skipped, so an email address or
 * question mark inside '…' is never mistaken for a parameter.
 */
export function toPositional(sql: string, params: Params = []): { text: string; values: unknown[] } {
  const named = !Array.isArray(params);
  const values: unknown[] = [];
  const nameIndex = new Map<string, number>();
  let positional = 0;
  let out = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (ch === "'") {
      const end = findQuoteEnd(sql, i);
      out += sql.slice(i, end + 1);
      i = end;
      continue;
    }

    if (!named && ch === '?') {
      values.push(coerce((params as unknown[])[positional]));
      positional += 1;
      out += `$${values.length}`;
      continue;
    }

    if (named && ch === '@' && /[A-Za-z_]/.test(sql[i + 1] ?? '')) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const name = sql.slice(i + 1, j);
      let index = nameIndex.get(name);
      if (index === undefined) {
        values.push(coerce((params as Record<string, unknown>)[name]));
        index = values.length;
        nameIndex.set(name, index);
      }
      out += `$${index}`;
      i = j - 1;
      continue;
    }

    out += ch;
  }

  return { text: out, values };
}

function findQuoteEnd(sql: string, start: number): number {
  for (let i = start + 1; i < sql.length; i++) {
    if (sql[i] === "'") {
      if (sql[i + 1] === "'") { i++; continue; } // escaped ''
      return i;
    }
  }
  return sql.length - 1;
}

/** Integer flag columns take 0/1, and undefined means NULL. */
function coerce(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Timestamps travel as ISO strings, the same shape on both backends. */
function normalise(row: Row): Row {
  for (const key of Object.keys(row)) {
    const v = row[key];
    if (v instanceof Date) row[key] = v.toISOString();
  }
  return row;
}

/* -------------------------------------------------------------- backends */

type Runner = (text: string, values: unknown[]) => Promise<RunResult>;

function makeDb(
  runner: Runner,
  execMulti: (sql: string) => Promise<void>,
  inTransaction: <T>(fn: (tx: Db) => Promise<T>) => Promise<T>,
): Db {
  const run = async (sql: string, params?: Params) => {
    const { text, values } = toPositional(sql, params);
    const result = await runner(text, values);
    return { rowCount: result.rowCount, rows: result.rows.map(normalise) };
  };
  return {
    run,
    async get<T>(sql: string, params?: Params) {
      return (await run(sql, params)).rows[0] as T | undefined;
    },
    async all<T>(sql: string, params?: Params) {
      return (await run(sql, params)).rows as T[];
    },
    exec: execMulti,
    transaction: inTransaction,
  };
}

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function postgresBackend(url: string): Db {
  const sql = postgres(url, {
    // Transaction poolers (Supabase port 6543, Neon "-pooler" hosts) do not
    // support prepared statements, and serverless platforms need the pooler.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocalHost(url) ? false : 'require',
    // COUNT and SUM return int8, which the driver hands back as text by
    // default; every such value here fits comfortably in a JS number.
    types: {
      int8: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
    onnotice: () => {},
  });

  // `nested` is explicit rather than inferred from the client's shape, so a
  // transaction is never silently skipped.
  const wrap = (client: postgres.Sql | postgres.TransactionSql, nested: boolean): Db =>
    makeDb(
      async (text, values) => {
        const result = await client.unsafe(text, values as postgres.ParameterOrJSON<never>[]);
        return { rows: [...result] as Row[], rowCount: result.count ?? result.length };
      },
      async (multi) => {
        await client.unsafe(multi);
      },
      async (fn) => {
        if (nested) return fn(wrap(client, true));
        return (await sql.begin((tx) => fn(wrap(tx, true)))) as Awaited<ReturnType<typeof fn>>;
      },
    );

  return wrap(sql, false);
}

async function pgliteBackend(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const configured = process.env.PGLITE_DIR?.trim();
  const dir =
    configured ||
    (process.env.VERCEL ? path.join(os.tmpdir(), 'fleet-pglite') : path.join(process.cwd(), 'data', 'pglite'));
  const pg = dir === 'memory://' ? new PGlite() : new PGlite(dir);

  type Queryable = Pick<InstanceType<typeof PGlite>, 'query' | 'exec'>;
  const wrap = (client: Queryable, nested: boolean): Db =>
    makeDb(
      async (text, values) => {
        const result = await client.query<Row>(text, values);
        return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
      },
      async (multi) => {
        await client.exec(multi);
      },
      async (fn) => {
        if (nested) return fn(wrap(client, true));
        return pg.transaction((tx) => fn(wrap(tx, true)));
      },
    );

  return wrap(pg, false);
}

/* ---------------------------------------------------------------- schema */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  name               TEXT NOT NULL,
  company            TEXT,
  phone              TEXT,
  role               TEXT NOT NULL DEFAULT 'member',
  stripe_customer_id TEXT UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id             SERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  body_style     TEXT NOT NULL,
  make           TEXT NOT NULL,
  model          TEXT NOT NULL,
  year           INTEGER NOT NULL,
  price          INTEGER NOT NULL,
  mileage        INTEGER NOT NULL,
  passengers     INTEGER NOT NULL,
  condition      TEXT NOT NULL DEFAULT 'Used',
  fuel           TEXT NOT NULL DEFAULT 'Gasoline',
  transmission   TEXT NOT NULL DEFAULT 'Automatic',
  drivetrain     TEXT NOT NULL DEFAULT 'RWD',
  exterior_color TEXT NOT NULL DEFAULT 'Black',
  interior_color TEXT NOT NULL DEFAULT 'Black',
  vin            TEXT,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  features       TEXT NOT NULL DEFAULT '[]',
  images         TEXT NOT NULL DEFAULT '[]',
  image_credits  TEXT NOT NULL DEFAULT '[]',
  seller_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  seller_name    TEXT NOT NULL DEFAULT '',
  seller_phone   TEXT NOT NULL DEFAULT '',
  featured       INTEGER NOT NULL DEFAULT 0,
  sold           INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published',
  views          INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_body_style ON listings(body_style);
CREATE INDEX IF NOT EXISTS idx_listings_make       ON listings(make);
CREATE INDEX IF NOT EXISTS idx_listings_price      ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_year       ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_seller     ON listings(seller_id, status, expires_at);

CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'listing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active',
  started_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end     TIMESTAMPTZ NOT NULL,
  cancelled_at           TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  stripe_subscription_id TEXT UNIQUE
);

-- At most one current plan per user, enforced by the database itself.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_current_subscription
  ON subscriptions(user_id) WHERE status IN ('active', 'cancelled');

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/* ------------------------------------------------------------- bootstrap */

/** Sample accounts with a published password: only where data is disposable. */
export function demoAccountsEnabled(): boolean {
  const flag = process.env.SEED_DEMO_ACCOUNTS?.trim();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return dbMode() === 'pglite';
}

function sampleInventoryEnabled(): boolean {
  const flag = process.env.SEED_DEMO_INVENTORY?.trim();
  return flag !== '0' && flag !== 'false';
}

/**
 * Runs once per server instance. The advisory lock stops two instances that
 * start together from seeding twice, and the app_meta flag means inventory is
 * loaded once per database: deleting every listing later does not bring the
 * samples back.
 */
async function bootstrap(db: Db): Promise<void> {
  await db.exec(SCHEMA);

  await db.transaction(async (tx) => {
    await tx.run('SELECT pg_advisory_xact_lock(727401)');

    const { ensureAdminFromEnv, seedSampleData } = await import('./seed');
    await ensureAdminFromEnv(tx);

    const seeded = await tx.get("SELECT 1 FROM app_meta WHERE key = 'sample_data_loaded'");
    if (!seeded && sampleInventoryEnabled()) {
      await seedSampleData(tx, { demoAccounts: demoAccountsEnabled() });
      await tx.run("INSERT INTO app_meta (key, value) VALUES ('sample_data_loaded', ?)", [new Date().toISOString()]);
    }
  });
}

/**
 * Process-wide state, kept on globalThis rather than in module scope. Next.js
 * can load this module more than once in a single server process (server
 * actions are bundled separately from page renders), and each copy would
 * otherwise open its own connection pool — or, with PGlite, a second handle on
 * the same data directory, which risks corrupting it.
 */
interface SharedState {
  connection?: Promise<Db>;
  ready?: Promise<Db>;
}
const shared = globalThis as typeof globalThis & { __fleetMarketplaceDb?: SharedState };
const state: SharedState = (shared.__fleetMarketplaceDb ??= {});

/** One client per process. Never recreated just because setup failed. */
function connection(): Promise<Db> {
  state.connection ??= (async () => {
    const url = connectionString();
    return url ? postgresBackend(url) : await pgliteBackend();
  })().catch((err) => {
    state.connection = undefined;
    throw err;
  });
  return state.connection;
}

export function getDb(): Promise<Db> {
  state.ready ??= (async () => {
    const db = await connection();
    await bootstrap(db);
    return db;
  })().catch((err) => {
    // Retry setup on the next request, reusing the same client rather than
    // opening (and leaking) a new pool each time.
    state.ready = undefined;
    throw err;
  });
  return state.ready;
}
