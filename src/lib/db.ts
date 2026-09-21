import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DB_DIR, 'fleet-marketplace.db');

let instance: Database.Database | null = null;

/** Table definitions. Kept idempotent so boot and seed share one code path. */
const SCHEMA = `
PRAGMA journal_mode = WAL;
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

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(SCHEMA);
  instance = db;
  return db;
}

export { DB_PATH };
