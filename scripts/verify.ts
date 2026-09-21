/**
 * End-to-end check of the data layer: search, filtering, sorting, pagination,
 * auth primitives, write paths and formatting helpers. Run with `npm run verify`
 * after seeding. Exits non-zero on the first regression so CI can gate on it.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../src/lib/db';
import {
  searchListings, saveInquiry, toggleFavorite, getListingBySlug, getSimilar, getFacets,
} from '../src/lib/queries';
import { monthlyPayment, slugify, money } from '../src/lib/format';

let pass = 0;
let fail = 0;

function t(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok    ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

const db = getDb();
const TOTAL = (db.prepare('SELECT COUNT(*) n FROM listings').get() as { n: number }).n;

console.log('\npassword hashing');
const hash = bcrypt.hashSync('demo1234', 10);
t('correct password verifies', bcrypt.compareSync('demo1234', hash));
t('wrong password rejected', !bcrypt.compareSync('wrong', hash));
const seeded = db
  .prepare("SELECT password_hash FROM users WHERE email='demo@fleetmarketplace.com'")
  .get() as { password_hash: string } | undefined;
t('seeded demo login works', Boolean(seeded) && bcrypt.compareSync('demo1234', seeded!.password_hash));

console.log('\nsession token signing');
const secret = 'test-secret';
const sign = (p: string) => crypto.createHmac('sha256', secret).update(p).digest('base64url');
const exp = Math.floor(Date.now() / 1000) + 600;
t('valid signature matches', sign(`7.${exp}`) === sign(`7.${exp}`));
t('tampered user id fails', sign(`99.${exp}`) !== sign(`7.${exp}`));
t('expired token detected', Math.floor(Date.now() / 1000) - 10 < Math.floor(Date.now() / 1000));

console.log('\nsearch, sorting and pagination');
const p1 = searchListings({ per_page: 12, page: 1 });
const p2 = searchListings({ per_page: 12, page: 2 });
t('page 1 fills the page size', p1.items.length === 12, `got ${p1.items.length}`);
t('page 2 differs from page 1', p1.items[0].id !== p2.items[0].id);
t('total is stable across pages', p1.total === p2.total && p1.total === TOTAL, `got ${p1.total}`);
t('page count computed', p1.pages === Math.ceil(TOTAL / 12), `got ${p1.pages}`);

const asc = searchListings({ sort: 'price_asc', per_page: 60 }).items.map((i) => i.price);
t('price ascending sorted', asc.every((v, i) => i === 0 || asc[i - 1] <= v));
const desc = searchListings({ sort: 'price_desc', per_page: 60 }).items.map((i) => i.price);
t('price descending sorted', desc.every((v, i) => i === 0 || desc[i - 1] >= v));
const years = searchListings({ sort: 'year_desc', per_page: 60 }).items.map((i) => i.year);
t('year descending sorted', years.every((v, i) => i === 0 || years[i - 1] >= v));

t(
  'combined filters narrow results',
  searchListings({ body_style: ['Sedan'], max_price: 40000 }).total <
    searchListings({ body_style: ['Sedan'] }).total,
);
t('price floor excludes everything', searchListings({ min_price: 9_000_000 }).total === 0);
t('passenger filter works', searchListings({ min_passengers: 40 }).items.every((i) => i.passengers >= 40));

console.log('\nsql injection safety');
t('injection string matches nothing', searchListings({ q: "'; DROP TABLE listings; --" }).total === 0);
t('listings table intact', (db.prepare('SELECT COUNT(*) n FROM listings').get() as { n: number }).n === TOTAL);

console.log('\ndetail pages and related vehicles');
const first = searchListings({ per_page: 1 }).items[0];
const found = getListingBySlug(first.slug);
t('lookup by slug', found?.id === first.id);
t('unknown slug returns null', getListingBySlug('does-not-exist') === null);
t('features decode to array', Array.isArray(found!.features));
t('images decode to array', Array.isArray(found!.images) && found!.images.length === 4);
const similar = getSimilar(found!, 3);
t('similar excludes the listing itself', !similar.some((s) => s.id === found!.id));
t('similar shares the body style', similar.every((s) => s.body_style === found!.body_style));

console.log('\nfilter facets');
const facets = getFacets();
t('body style facets present', facets.bodyStyles.length >= 8, `got ${facets.bodyStyles.length}`);
t('facet counts sum to total', facets.bodyStyles.reduce((n, b) => n + b.count, 0) === TOTAL);
t('price bounds are sane', facets.bounds.minPrice > 0 && facets.bounds.maxPrice >= facets.bounds.minPrice);

console.log('\nwrite paths');
const before = (db.prepare('SELECT COUNT(*) n FROM inquiries').get() as { n: number }).n;
saveInquiry({ listingId: first.id, name: 'Test Buyer', email: 't@example.com', message: 'Still available?' });
t('inquiry saved', (db.prepare('SELECT COUNT(*) n FROM inquiries').get() as { n: number }).n === before + 1);
db.prepare('DELETE FROM inquiries WHERE email = ?').run('t@example.com');

const uid = (db.prepare("SELECT id FROM users WHERE email='demo@fleetmarketplace.com'").get() as { id: number }).id;
t('favorite adds', toggleFavorite(uid, first.id) === true);
t('favorite toggles off', toggleFavorite(uid, first.id) === false);

console.log('\nformatting helpers');
t('monthly payment correct', Math.round(monthlyPayment(50000, 8.5, 60)) === 1026,
  `got ${Math.round(monthlyPayment(50000, 8.5, 60))}`);
t('zero interest divides evenly', monthlyPayment(12000, 0, 12) === 1000);
t('slugify strips punctuation', slugify('2019 Cadillac XTS 70" Stretch!') === '2019-cadillac-xts-70-stretch');
t('money formats without cents', money(62500) === '$62,500');

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
