/**
 * Attaches real photographs to listings.
 *
 * Two modes:
 *
 *   1. Folder  — npm run import-photos -- --dir ./photos
 *      Reads ./photos/<listing-slug>/*.jpg and attaches each folder's images to
 *      the listing with that slug.
 *
 *   2. Manifest — npm run import-photos -- --manifest ./photos.json
 *      Add --link to store the URLs directly instead of downloading them,
 *      which is what you want when the images stay hosted elsewhere.
 *      photos.json maps slugs to image URLs or local paths:
 *        { "2019-cadillac-xts-stretch-limousine-1": ["https://…/a.jpg", "./b.jpg"] }
 *      Remote URLs are downloaded; local paths are copied.
 *
 * Both modes copy files into public/uploads and rewrite the listing's `images`
 * column. Pass --replace to discard existing photos instead of appending.
 *
 * Run this on a machine with normal network access — a restricted environment
 * may not be able to reach image hosts.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const DIR = flag('dir');
const MANIFEST = flag('manifest');
const REPLACE = has('replace');
const LINK_ONLY = has('link');

if (!DIR && !MANIFEST) {
  console.error('Usage: npm run import-photos -- --dir ./photos [--replace]');
  console.error('       npm run import-photos -- --manifest ./photos.json [--replace]');
  process.exit(1);
}

const ROOT = process.cwd();
const UPLOADS = path.join(ROOT, 'public', 'uploads');
const DB_PATH = process.env.DATABASE_PATH ?? path.join(ROOT, 'data', 'fleet-marketplace.db');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

fs.mkdirSync(UPLOADS, { recursive: true });
const db = new Database(DB_PATH);

function store(buffer, ext) {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), buffer);
  return `/uploads/${name}`;
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  const ext =
    type.includes('png') ? '.png'
    : type.includes('webp') ? '.webp'
    : type.includes('avif') ? '.avif'
    : '.jpg';
  return store(Buffer.from(await res.arrayBuffer()), ext);
}

/** Resolve one source (URL or local path) to a public /uploads path. */
async function resolve(source) {
  // --link records the URL as-is, for hosts that serve the images directly.
  if (LINK_ONLY && /^https?:\/\//i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return fetchImage(source);

  const abs = path.resolve(ROOT, source);
  const ext = path.extname(abs).toLowerCase();
  if (!ALLOWED.has(ext)) throw new Error(`unsupported type ${ext}`);
  return store(fs.readFileSync(abs), ext);
}

function buildJobs() {
  if (MANIFEST) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8'));
    return Object.entries(raw).map(([slug, sources]) => ({ slug, sources }));
  }

  const base = path.resolve(ROOT, DIR);
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({
      slug: e.name,
      sources: fs
        .readdirSync(path.join(base, e.name))
        .filter((f) => ALLOWED.has(path.extname(f).toLowerCase()))
        .sort()
        .map((f) => path.join(base, e.name, f)),
    }));
}

const select = db.prepare('SELECT id, images FROM listings WHERE slug = ?');
const update = db.prepare('UPDATE listings SET images = ? WHERE id = ?');

let updated = 0;
let attached = 0;
let missing = 0;

for (const job of buildJobs()) {
  const row = select.get(job.slug);
  if (!row) {
    console.warn(`  skip   ${job.slug} — no listing with that slug`);
    missing += 1;
    continue;
  }

  const paths = [];
  for (const source of job.sources) {
    try {
      paths.push(await resolve(source));
      attached += 1;
    } catch (err) {
      console.warn(`  warn   ${job.slug} — ${source}: ${err.message}`);
    }
  }

  if (paths.length === 0) continue;

  let existing = [];
  try {
    existing = JSON.parse(row.images) ?? [];
  } catch {
    existing = [];
  }
  // Drawn placeholders are always replaced once real photography arrives.
  const kept = REPLACE ? [] : existing.filter((p) => !p.startsWith('/img/'));

  update.run(JSON.stringify([...kept, ...paths]), row.id);
  updated += 1;
  console.log(`  ok     ${job.slug} — ${paths.length} photo(s)`);
}

console.log(`\n${updated} listing(s) updated, ${attached} photo(s) attached, ${missing} slug(s) not found`);
console.log(`database: ${DB_PATH}`);
