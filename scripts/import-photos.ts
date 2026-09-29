/**
 * Attaches real photographs to listings.
 *
 *   npm run import-photos -- --dir ./photos
 *     Reads ./photos/<listing-slug>/*.jpg and attaches each folder's images.
 *
 *   npm run import-photos -- --manifest ./photos.json [--link]
 *     photos.json maps slugs to image URLs or local paths:
 *       { "2019-cadillac-xts-stretch-limousine-1": ["https://…/a.jpg", "./b.jpg"] }
 *     Remote URLs are downloaded unless --link, which stores them as-is.
 *
 * Downloaded and local files are copied into public/uploads. Pass --replace
 * to discard existing photos instead of appending. Uses the same database as
 * the app, so set DATABASE_URL to update a hosted one.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from '../src/lib/db';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const has = (name: string) => args.includes(`--${name}`);

const DIR = flag('dir');
const MANIFEST = flag('manifest');
const REPLACE = has('replace');
const LINK_ONLY = has('link');
const ROOT = process.cwd();
const UPLOADS = path.join(ROOT, 'public', 'uploads');
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function store(buffer: Buffer, ext: string): string {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), buffer);
  return `/uploads/${name}`;
}

async function resolve(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    if (LINK_ONLY) return source;
    const res = await fetch(source);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : type.includes('avif') ? '.avif' : '.jpg';
    return store(Buffer.from(await res.arrayBuffer()), ext);
  }
  const abs = path.resolve(ROOT, source);
  const ext = path.extname(abs).toLowerCase();
  if (!ALLOWED.has(ext)) throw new Error(`unsupported type ${ext}`);
  return store(fs.readFileSync(abs), ext);
}

function jobs(): { slug: string; sources: string[] }[] {
  if (MANIFEST) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8')) as Record<string, string[]>;
    return Object.entries(raw).map(([slug, sources]) => ({ slug, sources }));
  }
  const base = path.resolve(ROOT, DIR!);
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

async function main() {
  if (!DIR && !MANIFEST) {
    console.error('Usage: npm run import-photos -- --dir ./photos [--replace]');
    console.error('       npm run import-photos -- --manifest ./photos.json [--link] [--replace]');
    process.exit(1);
  }
  fs.mkdirSync(UPLOADS, { recursive: true });
  const db = await getDb();

  let updated = 0;
  let attached = 0;
  let missing = 0;

  for (const job of jobs()) {
    const row = await db.get<{ id: number; images: string }>('SELECT id, images FROM listings WHERE slug = ?', [job.slug]);
    if (!row) {
      console.warn(`  skip   ${job.slug} — no listing with that slug`);
      missing += 1;
      continue;
    }

    const paths: string[] = [];
    for (const source of job.sources) {
      try {
        paths.push(await resolve(source));
        attached += 1;
      } catch (err) {
        console.warn(`  warn   ${job.slug} — ${source}: ${(err as Error).message}`);
      }
    }
    if (paths.length === 0) continue;

    let existing: string[] = [];
    try {
      existing = JSON.parse(row.images) ?? [];
    } catch {
      existing = [];
    }
    // Drawn placeholders are always replaced once real photography arrives.
    const kept = REPLACE ? [] : existing.filter((p) => !p.startsWith('/img/'));
    await db.run('UPDATE listings SET images = ? WHERE id = ?', [JSON.stringify([...kept, ...paths]), row.id]);
    updated += 1;
    console.log(`  ok     ${job.slug} — ${paths.length} photo(s)`);
  }

  console.log(`\n${updated} listing(s) updated, ${attached} photo(s) attached, ${missing} slug(s) not found`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
