import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Database as WasmDatabase } from 'node-sqlite3-wasm';

/**
 * SQLite runs through a WebAssembly build rather than a native binding.
 *
 * The native driver aborts the process on serverless platforms: its Statement
 * destructor runs while the V8 isolate is being torn down between invocations
 * and trips an assertion in RemoveEnvironmentCleanupHook, killing the function
 * with SIGABRT. WASM has no such teardown hook, so it survives the lifecycle.
 *
 * A small adapter keeps the better-sqlite3 call style used across the data
 * layer (spread parameters, named-object parameters, .pragma, .transaction).
 */

const PROJECT_DB = path.join(process.cwd(), 'data', 'fleet-marketplace.db');
const SOURCE_PATH = process.env.DATABASE_PATH ?? PROJECT_DB;

let instance: DbHandle | null = null;
let activePath = SOURCE_PATH;

function ephemeral(): boolean {
  const flag = process.env.EPHEMERAL_DB?.trim();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return Boolean(process.env.VERCEL);
}

function resolvePath(): string {
  if (!ephemeral()) return SOURCE_PATH;

  const target = path.join(os.tmpdir(), 'fleet-marketplace.db');
  if (!fs.existsSync(target) && fs.existsSync(SOURCE_PATH)) {
    fs.copyFileSync(SOURCE_PATH, target);
  }
  return target;
}

type Row = Record<string, unknown>;

function isPlainObject(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** SQLite accepts no booleans or undefined, so normalise before binding. */
function coerce(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/**
 * Accepts either positional values or a single named-parameter object, and
 * returns what the WASM driver expects. Named keys are given the `@` prefix
 * the driver requires, so callers can keep writing plain keys.
 */
function bind(params: unknown[]): unknown[] | Row | undefined {
  if (params.length === 0) return undefined;

  if (params.length === 1 && isPlainObject(params[0])) {
    const out: Row = {};
    for (const [key, value] of Object.entries(params[0])) {
      out[key.startsWith('@') ? key : `@${key}`] = coerce(value);
    }
    return out;
  }

  return params.map(coerce);
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface PreparedStatement {
  get<T = Row>(...params: unknown[]): T | undefined;
  all<T = Row>(...params: unknown[]): T[];
  run(...params: unknown[]): RunResult;
}

export interface DbHandle {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  pragma(statement: string): void;
  transaction<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void;
  close(): void;
  raw: WasmDatabase;
}

function wrap(db: WasmDatabase): DbHandle {
  /**
   * Statements are finalised immediately after use. Holding them open would
   * grow WASM memory across a long-lived instance for no benefit at this size.
   */
  function withStatement<T>(sql: string, use: (stmt: ReturnType<WasmDatabase['prepare']>) => T): T {
    const stmt = db.prepare(sql);
    try {
      return use(stmt);
    } finally {
      stmt.finalize();
    }
  }

  return {
    prepare(sql: string): PreparedStatement {
      return {
        get<T = Row>(...params: unknown[]): T | undefined {
          return withStatement(sql, (s) => (s.get(bind(params) as never) ?? undefined) as T | undefined);
        },
        all<T = Row>(...params: unknown[]): T[] {
          return withStatement(sql, (s) => (s.all(bind(params) as never) ?? []) as T[]);
        },
        run(...params: unknown[]): RunResult {
          return withStatement(sql, (s) => {
            const result = s.run(bind(params) as never) as unknown as RunResult | undefined;
            return {
              changes: Number(result?.changes ?? 0),
              lastInsertRowid: Number(result?.lastInsertRowid ?? 0),
            };
          });
        },
      };
    },

    exec(sql: string): void {
      db.exec(sql);
    },

    // The WASM driver has no pragma() helper; PRAGMA is just a statement.
    pragma(statement: string): void {
      db.run(`PRAGMA ${statement}`);
    },

    transaction<A extends unknown[]>(fn: (...args: A) => void) {
      return (...args: A) => {
        db.run('BEGIN');
        try {
          fn(...args);
          db.run('COMMIT');
        } catch (err) {
          db.run('ROLLBACK');
          throw err;
        }
      };
    },

    close(): void {
      db.close();
    },

    raw: db,
  };
}

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  company       TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_body_style ON listings(body_style);
CREATE INDEX IF NOT EXISTS idx_listings_make       ON listings(make);
CREATE INDEX IF NOT EXISTS idx_listings_price      ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_year       ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings(status);

CREATE TABLE IF NOT EXISTS inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'listing',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, listing_id)
);
`;

/** Brings databases created by an earlier version up to the current columns. */
function migrate(db: DbHandle): void {
  const columns = db.prepare('PRAGMA table_info(listings)').all<{ name: string }>();
  if (!columns.some((c) => c.name === 'image_credits')) {
    db.exec("ALTER TABLE listings ADD COLUMN image_credits TEXT NOT NULL DEFAULT '[]'");
  }
}

export function getDb(): DbHandle {
  if (instance) return instance;

  activePath = resolvePath();
  fs.mkdirSync(path.dirname(activePath), { recursive: true });

  const db = wrap(new WasmDatabase(activePath));

  // WAL leaves sidecar files that do not survive being copied, so the
  // ephemeral copy keeps its journal in memory instead.
  db.pragma(ephemeral() ? 'journal_mode = MEMORY' : 'journal_mode = WAL');
  db.exec(SCHEMA);
  migrate(db);

  instance = db;
  return db;
}

export function isEphemeral(): boolean {
  return ephemeral();
}

export function databasePath(): string {
  return activePath;
}

export { SOURCE_PATH as DB_PATH };
