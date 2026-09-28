/**
 * Exercises the subscription rules against a throwaway copy of the database:
 * the plan catalogue, subscribing and switching, quota enforcement, listing
 * expiry and renewal, cancellation and period roll-over.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = path.join(os.tmpdir(), `fm-subs-${process.pid}.db`);
fs.copyFileSync(path.join(process.cwd(), 'data', 'fleet-marketplace.db'), tmp);
process.env.DATABASE_PATH = tmp;
process.env.EPHEMERAL_DB = '0';

let pass = 0;
let fail = 0;
function t(name: string, cond: boolean, extra = '') {
  if (cond) { pass += 1; console.log(`  ok    ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

async function main() {
  // Imported after DATABASE_PATH is set so the module opens the copy.
  const { getDb } = await import('../src/lib/db');
  const { PLANS, getPlan } = await import('../src/lib/plans');
  const S = await import('../src/lib/subscriptions');
  const { searchListings } = await import('../src/lib/queries');
  const db = getDb();

  const newUser = (email: string) =>
    Number(db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, 'x', 'Test')").run(email).lastInsertRowid);

  let seq = 0;
  /** Inserts a listing the way createListing does for a subscriber. */
  const list = (userId: number, expires = S.LISTING_EXPIRY_SQL) => {
    seq += 1;
    return Number(
      db.prepare(
        `INSERT INTO listings (slug, title, body_style, make, model, year, price, mileage, passengers,
           city, state, seller_id, status, expires_at)
         VALUES (?, 'Test', 'Sedan', 'Cadillac', 'XTS', 2020, 1000, 1, 4, 'X', 'CA', ?, 'published', ${expires})`,
      ).run(`test-${process.pid}-${seq}`, userId).lastInsertRowid,
    );
  };

  console.log('\nplan catalogue (matches the original pricing)');
  const expected: [string, number, number][] = [
    ['individual-bronze', 1, 59], ['individual-silver', 2, 109], ['individual-gold', 3, 149],
    ['dealer-bronze', 5, 199], ['dealer-silver', 10, 349], ['dealer-gold', 30, 899],
  ];
  for (const [id, listings, price] of expected) {
    const plan = getPlan(id);
    t(`${id}: ${listings} listing(s) at $${price}`, plan?.listings === listings && plan?.price === price);
  }
  t('six plans, dealer silver marked popular', PLANS.length === 6 && getPlan('dealer-silver')?.popular === true);

  console.log('\nsubscribing and quotas');
  const u = newUser('quota@test');
  let q = S.quotaFor(u);
  t('no plan: cannot list', !q.canList && q.reason === 'no-plan');

  S.subscribe(u, 'individual-bronze');
  q = S.quotaFor(u);
  t('bronze: 1 slot free', q.canList && q.limit === 1 && q.remaining === 1);

  const first = list(u);
  q = S.quotaFor(u);
  t('after one listing: full', !q.canList && q.reason === 'full' && q.used === 1);

  S.subscribe(u, 'individual-gold');
  q = S.quotaFor(u);
  t('upgrade to gold: 2 more slots', q.canList && q.limit === 3 && q.remaining === 2);
  t('switching leaves exactly one current plan',
    (db.prepare("SELECT COUNT(*) n FROM subscriptions WHERE user_id = ? AND status IN ('active','cancelled')").get(u) as { n: number }).n === 1);

  list(u); list(u);
  t('gold full at 3', S.quotaFor(u).reason === 'full');

  S.subscribe(u, 'individual-bronze');
  q = S.quotaFor(u);
  t('downgrade below usage: listings stay, but no new ones', q.used === 3 && !q.canList && q.remaining === 0);

  db.prepare('UPDATE listings SET sold = 1 WHERE id = ?').run(first);
  t('a sold listing frees its slot', S.quotaFor(u).used === 2);

  console.log('\nlisting period');
  const v = newUser('expiry@test');
  S.subscribe(v, 'individual-silver');
  const expiring = list(v);
  const before = searchListings({ per_page: 60 }).total;
  db.prepare("UPDATE listings SET expires_at = datetime('now', '-1 day') WHERE id = ?").run(expiring);
  t('expired listing leaves public search', searchListings({ per_page: 60 }).total === before - 1);
  t('expired listing frees its slot', S.quotaFor(v).used === 0);

  const renewed = S.renewListing(v, expiring);
  const row = db.prepare("SELECT expires_at > datetime('now', '+29 days') AS ok FROM listings WHERE id = ?").get(expiring) as { ok: number };
  t('renew brings it back for 30 days', renewed.ok && row.ok === 1 && searchListings({ per_page: 60 }).total === before);

  list(v);
  const third = list(v, "datetime('now', '-1 day')");
  const blocked = S.renewListing(v, third);
  t('renewing an expired listing needs a free slot', !blocked.ok && blocked.reason === 'full');
  t('extending a live listing needs no free slot', S.renewListing(v, expiring).ok);
  t('cannot renew someone else\'s listing', S.renewListing(u, expiring).ok === false);

  console.log('\ncancel, resume and roll-over');
  const w = newUser('cancel@test');
  S.subscribe(w, 'dealer-silver');
  t('cancel stops renewal', S.cancelSubscription(w));
  let sub = S.currentSubscription(w);
  t('cancelled plan still works until period end', sub?.status === 'cancelled' && S.quotaFor(w).canList);
  t('resume restores renewal', S.resumeSubscription(w) && S.currentSubscription(w)?.status === 'active');

  S.cancelSubscription(w);
  db.prepare("UPDATE subscriptions SET current_period_end = datetime('now', '-1 hour') WHERE user_id = ?").run(w);
  t('cancelled plan ends after its period', S.currentSubscription(w) === null && S.quotaFor(w).reason === 'no-plan');
  t('ended plan cannot be resumed', !S.resumeSubscription(w));

  const x = newUser('rollover@test');
  S.subscribe(x, 'dealer-bronze');
  db.prepare("UPDATE subscriptions SET current_period_end = datetime('now', '-65 days') WHERE user_id = ?").run(x);
  sub = S.currentSubscription(x);
  t('active plan rolls forward past a lapsed period', sub !== null && S.daysUntil(sub.current_period_end)! > 0 && S.daysUntil(sub.current_period_end)! <= 30,
    `days left ${sub && S.daysUntil(sub.current_period_end)}`);

  console.log('\nseeded demo account');
  const demo = (db.prepare("SELECT id FROM users WHERE email = 'demo@fleetmarketplace.com'").get() as { id: number }).id;
  const dq = S.quotaFor(demo);
  t('demo seller is on silver with 1 of 2 slots used', dq.subscription?.plan.id === 'individual-silver' && dq.used === 1 && dq.remaining === 1,
    JSON.stringify({ plan: dq.subscription?.plan.id, used: dq.used }));

  db.close();
  fs.rmSync(tmp, { force: true });
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
