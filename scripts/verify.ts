/**
 * End-to-end check of the data layer against a throwaway in-memory Postgres
 * (PGlite): bootstrap and seeding, search, filtering, sorting, pagination,
 * placeholders, auth, write paths and formatting helpers. Never touches a real
 * database. Exits non-zero on any failure so CI can gate on it.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

// Must be set before the db module is loaded.
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.PGLITE_DIR = 'memory://';
process.env.ADMIN_EMAIL = 'owner@example.com';
process.env.ADMIN_PASSWORD = 'owner-password-1';

let pass = 0;
let fail = 0;
function t(name: string, cond: boolean, extra = '') {
  if (cond) { pass += 1; console.log(`  ok    ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

async function main() {
  const { getDb, toPositional, dbMode } = await import('../src/lib/db');
  const Q = await import('../src/lib/queries');
  const { monthlyPayment, slugify, money, parseTimestamp } = await import('../src/lib/format');
  const { liveSql } = await import('../src/lib/types');
  const db = await getDb();
  const count = async (sql: string, params?: unknown[]) => (await db.get<{ n: number }>(sql, params))!.n;

  console.log('\nbootstrap');
  t('runs on PGlite when no DATABASE_URL is set', dbMode() === 'pglite');
  const ALL = await count('SELECT COUNT(*) AS n FROM listings');
  const TOTAL = await count(`SELECT COUNT(*) AS n FROM listings WHERE ${liveSql()}`);
  t('fresh database seeds 32 sample listings', ALL === 32, `got ${ALL}`);
  t('counts come back as numbers, not strings', typeof TOTAL === 'number');
  const owner = await db.get<{ role: string; password_hash: string }>("SELECT role, password_hash FROM users WHERE email = 'owner@example.com'");
  t('ADMIN_EMAIL/ADMIN_PASSWORD creates the admin', owner?.role === 'admin' && bcrypt.compareSync('owner-password-1', owner.password_hash));
  t('sample data is only loaded once', (await count("SELECT COUNT(*) AS n FROM app_meta WHERE key = 'sample_data_loaded'")) === 1);
  const created = await db.get<{ created_at: string }>('SELECT created_at FROM listings LIMIT 1');
  t('timestamps come back as ISO strings', typeof created?.created_at === 'string' && created.created_at.endsWith('Z'));

  console.log('\nrow level security (blocks Supabase\'s public Data API)');
  const unlocked = await db.all<{ relname: string }>(
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
  );
  t('every app table has RLS enabled', unlocked.length === 0, `unlocked: ${unlocked.map((r) => r.relname).join(', ')}`);
  // PGlite runs as a superuser, which skips RLS entirely, so prove the real
  // rule with ordinary roles: the owner (the app) keeps access, others see nothing.
  await db.exec(`
    CREATE ROLE rls_app NOLOGIN; CREATE ROLE rls_public NOLOGIN;
    CREATE SCHEMA rls_check AUTHORIZATION rls_app;
    GRANT USAGE ON SCHEMA rls_check TO rls_public;
  `);
  const probe = await db.transaction(async (tx) => {
    await tx.run('SET LOCAL ROLE rls_app');
    await tx.exec(`
      CREATE TABLE rls_check.users (email TEXT);
      ALTER TABLE rls_check.users ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT ON rls_check.users TO rls_public;
      INSERT INTO rls_check.users VALUES ('a@x.com'), ('b@x.com');
    `);
    const owner = (await tx.get<{ n: number }>('SELECT COUNT(*) AS n FROM rls_check.users'))!.n;
    await tx.run('SET LOCAL ROLE rls_public');
    const outsider = (await tx.get<{ n: number }>('SELECT COUNT(*) AS n FROM rls_check.users'))!.n;
    let outsiderInsert = 'allowed';
    await tx.run('SAVEPOINT s');
    try { await tx.run("INSERT INTO rls_check.users VALUES ('evil@x.com')"); }
    catch { outsiderInsert = 'refused'; await tx.run('ROLLBACK TO SAVEPOINT s'); }
    return { owner, outsider, outsiderInsert };
  });
  t('table owner (the app) still reads every row', probe.owner === 2, `owner saw ${probe.owner}`);
  t('another role with table grants sees no rows', probe.outsider === 0, `outsider saw ${probe.outsider}`);
  t('another role cannot insert rows', probe.outsiderInsert === 'refused');

  console.log('\nplaceholders');
  t('? becomes $n', toPositional('a = ? AND b = ?', [1, 2]).text === 'a = $1 AND b = $2');
  t('? inside quotes is left alone', toPositional("x = '?' AND y = ?", [5]).text === "x = '?' AND y = $1");
  const named = toPositional("u = @id OR v = @id OR e = 'me@site.com' OR w = @other", { id: 7, other: 'o' });
  t('named params dedupe and skip quoted @', named.text === "u = $1 OR v = $1 OR e = 'me@site.com' OR w = $2" && named.values.length === 2, named.text);
  t('booleans become 0/1, undefined becomes NULL', JSON.stringify(toPositional('?,?', [true, undefined]).values) === '[1,null]');

  console.log('\npassword hashing');
  const hash = bcrypt.hashSync('demo1234', 10);
  t('correct password verifies', bcrypt.compareSync('demo1234', hash));
  t('wrong password rejected', !bcrypt.compareSync('wrong', hash));
  const seeded = await db.get<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = 'demo@fleetmarketplace.com'");
  t('seeded demo login works', Boolean(seeded) && bcrypt.compareSync('demo1234', seeded!.password_hash));

  console.log('\nsession signing');
  const env = process.env as Record<string, string | undefined>;
  const auth = await import('../src/lib/auth');
  const token = auth.createToken(7);
  t('valid token verifies', auth.verifyToken(token) === 7);
  const [, expiry, sig] = token.split('.');
  t('tampered user id is rejected', auth.verifyToken(`99.${expiry}.${sig}`) === null);
  const oldEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  delete env.SESSION_SECRET;
  let threw = false;
  try { auth.createToken(7); } catch (e) { threw = e instanceof auth.SessionConfigError; }
  t('production without SESSION_SECRET refuses to sign', threw);
  t('production without SESSION_SECRET verifies nothing', auth.verifyToken(token) === null);
  env.SESSION_SECRET = 'short';
  t('a too-short secret is refused', !auth.sessionsConfigured());
  env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  t('a real secret works in production', auth.verifyToken(auth.createToken(3)) === 3);
  t('tokens signed with the old dev key stop working', auth.verifyToken(token) === null);
  env.NODE_ENV = oldEnv;
  delete env.SESSION_SECRET;

  console.log('\nsearch, sorting and pagination');
  const p1 = await Q.searchListings({ per_page: 12, page: 1 });
  const p2 = await Q.searchListings({ per_page: 12, page: 2 });
  t('page 1 fills the page size', p1.items.length === 12, `got ${p1.items.length}`);
  t('page 2 differs from page 1', p1.items[0].id !== p2.items[0].id);
  t('total is stable across pages', p1.total === p2.total && p1.total === TOTAL, `got ${p1.total}`);
  t('page count computed', p1.pages === Math.ceil(TOTAL / 12), `got ${p1.pages}`);
  const asc = (await Q.searchListings({ sort: 'price_asc', per_page: 60 })).items.map((i) => i.price);
  t('price ascending sorted', asc.every((v, i) => i === 0 || asc[i - 1] <= v));
  const desc = (await Q.searchListings({ sort: 'price_desc', per_page: 60 })).items.map((i) => i.price);
  t('price descending sorted', desc.every((v, i) => i === 0 || desc[i - 1] >= v));
  const years = (await Q.searchListings({ sort: 'year_desc', per_page: 60 })).items.map((i) => i.year);
  t('year descending sorted', years.every((v, i) => i === 0 || years[i - 1] >= v));
  t('combined filters narrow results',
    (await Q.searchListings({ body_style: ['Sedan'], max_price: 40000 })).total < (await Q.searchListings({ body_style: ['Sedan'] })).total);
  t('price floor excludes everything', (await Q.searchListings({ min_price: 9_000_000 })).total === 0);
  t('passenger filter works', (await Q.searchListings({ min_passengers: 40 })).items.every((i) => i.passengers >= 40));
  const lower = await Q.searchListings({ q: 'escalade' });
  const upper = await Q.searchListings({ q: 'ESCALADE' });
  t('keyword search ignores case', lower.total > 0 && lower.total === upper.total, `${lower.total} vs ${upper.total}`);

  console.log('\nsql injection safety');
  t('injection string matches nothing', (await Q.searchListings({ q: "'; DROP TABLE listings; --" })).total === 0);
  t('listings table intact', (await count('SELECT COUNT(*) AS n FROM listings')) === ALL);
  t('expired listings are hidden from search', ALL > TOTAL && (await Q.searchListings({ per_page: 60 })).total === TOTAL);

  console.log('\ndetail pages and related vehicles');
  const first = (await Q.searchListings({ per_page: 1 })).items[0];
  const found = await Q.getListingBySlug(first.slug);
  t('lookup by slug', found?.id === first.id);
  t('unknown slug returns null', (await Q.getListingBySlug('does-not-exist')) === null);
  t('features decode to array', Array.isArray(found!.features));
  t('images decode to array', Array.isArray(found!.images) && found!.images.length === 4);
  const similar = await Q.getSimilar(found!, 3);
  t('similar excludes the listing itself', !similar.some((s) => s.id === found!.id));
  t('similar shares the body style', similar.every((s) => s.body_style === found!.body_style));

  console.log('\nfilter facets');
  const facets = await Q.getFacets();
  t('body style facets present', facets.bodyStyles.length >= 8, `got ${facets.bodyStyles.length}`);
  t('facet counts sum to total', facets.bodyStyles.reduce((n, b) => n + b.count, 0) === TOTAL);
  t('price bounds are sane', facets.bounds.minPrice > 0 && facets.bounds.maxPrice >= facets.bounds.minPrice);

  console.log('\nwrite paths');
  const before = await count('SELECT COUNT(*) AS n FROM inquiries');
  await Q.saveInquiry({ listingId: first.id, name: 'Test Buyer', email: 't@example.com', message: 'Still available?' });
  t('inquiry saved', (await count('SELECT COUNT(*) AS n FROM inquiries')) === before + 1);
  const uid = (await db.get<{ id: number }>("SELECT id FROM users WHERE email = 'demo@fleetmarketplace.com'"))!.id;
  t('favorite adds', (await Q.toggleFavorite(uid, first.id)) === true);
  t('favorite toggles off', (await Q.toggleFavorite(uid, first.id)) === false);
  let duplicate = false;
  try { await db.run("INSERT INTO users (email, password_hash, name) VALUES ('demo@fleetmarketplace.com', 'x', 'Dup')"); }
  catch { duplicate = true; }
  t('database rejects a duplicate email', duplicate);

  console.log('\nformatting helpers');
  t('monthly payment correct', Math.round(monthlyPayment(50000, 8.5, 60)) === 1026, `got ${Math.round(monthlyPayment(50000, 8.5, 60))}`);
  t('zero interest divides evenly', monthlyPayment(12000, 0, 12) === 1000);
  t('slugify strips punctuation', slugify('2019 Cadillac XTS 70" Stretch!') === '2019-cadillac-xts-70-stretch');
  t('money formats without cents', money(62500) === '$62,500');
  t('parses ISO and legacy timestamps alike',
    parseTimestamp('2026-01-02T03:04:05.000Z').getTime() === parseTimestamp('2026-01-02 03:04:05').getTime());

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
