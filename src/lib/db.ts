import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_DB = path.join(process.cwd(), 'data', 'fleet-marketplace.db');
const SOURCE_PATH = process.env.DATABASE_PATH ?? PROJECT_DB;

let instance: Database.Database | null = null;
let activePath = SOURCE_PATH;

/**
 * Serverless platforms (Vercel among them) mount the deployment read-only and
 * expose only the temp directory for writes. Set EPHEMERAL_DB=0 to force
 * normal on-disk behaviour, or =1 to opt in outside Vercel.
 */
function ephemeral(): boolean {
  const flag = process.env.EPHEMERAL_DB?.trim();
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return Boolean(process.env.VERCEL);
}

/**
 * Resolves the file the connection actually opens. In ephemeral mode the
 * committed database is copied into the temp directory once per cold start so
 * the admin remains writable; those writes last only as long as the instance.
 */
function resolvePath(): string {
  if (!ephemeral()) return SOURCE_PATH;

  const target = path.join(os.tmpdir(), 'fleet-marketplace.db');
  if (!fs.existsSync(target)) {
    if (fs.existsSync(SOURCE_PATH)) fs.copyFileSync(SOURCE_PATH, target);
    else fs.writeFileSync(target, '');
  }
  return target;
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

export function getDb(): Database.Database {
  if (instance) return instance;

  activePath = resolvePath();
  fs.mkdirSync(path.dirname(activePath), { recursive: true });

  const db = new Database(activePath);

  // WAL leaves sidecar files, which do not survive being copied around, so the
  // ephemeral copy keeps its journal in memory instead.
  db.pragma(ephemeral() ? 'journal_mode = MEMORY' : 'journal_mode = WAL');
  db.exec(SCHEMA);

  instance = db;
  return db;
}

/** True when writes land on a copy that disappears with the instance. */
export function isEphemeral(): boolean {
  return ephemeral();
}

export function databasePath(): string {
  return activePath;
}

export { SOURCE_PATH as DB_PATH };
