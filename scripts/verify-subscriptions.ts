/**
 * Exercises the subscription rules against a throwaway in-memory Postgres:
 * the plan catalogue, subscribing and switching, quota enforcement, listing
 * expiry and renewal, cancellation and period roll-over.
 */
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.PGLITE_DIR = 'memory://';

let pass = 0;
let fail = 0;
function t(name: string, cond: boolean, extra = '') {
  if (cond) { pass += 1; console.log(`  ok    ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

async function main() {
  const { getDb } = await import('../src/lib/db');
  const { PLANS, getPlan } = await import('../src/lib/plans');
  const S = await import('../src/lib/subscriptions');
  const { searchListings } = await import('../src/lib/queries');
  const db = await getDb();

  const newUser = async (email: string) =>
    (await db.get<{ id: number }>("INSERT INTO users (email, password_hash, name) VALUES (?, 'x', 'Test') RETURNING id", [email]))!.id;

  let seq = 0;
  /** Inserts a listing the way createListing does for a subscriber. */
  const list = async (userId: number, expires = S.LISTING_EXPIRY_SQL) => {
    seq += 1;
    return (await db.get<{ id: number }>(
      `INSERT INTO listings (slug, title, body_style, make, model, year, price, mileage, passengers,
         city, state, seller_id, status, expires_at)
       VALUES (?, 'Test', 'Sedan', 'Cadillac', 'XTS', 2020, 1000, 1, 4, 'X', 'CA', ?, 'published', ${expires})
       RETURNING id`,
      [`test-${seq}`, userId],
    ))!.id;
  };
  const shift = (table: string, column: string, id: number, interval: string, key = 'id') =>
    db.run(`UPDATE ${table} SET ${column} = now() + interval '${interval}' WHERE ${key} = ?`, [id]);

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
  const u = await newUser('quota@test');
  let q = await S.quotaFor(u);
  t('no plan: cannot list', !q.canList && q.reason === 'no-plan');

  await S.subscribe(u, 'individual-bronze');
  q = await S.quotaFor(u);
  t('bronze: 1 slot free', q.canList && q.limit === 1 && q.remaining === 1);

  const first = await list(u);
  q = await S.quotaFor(u);
  t('after one listing: full', !q.canList && q.reason === 'full' && q.used === 1);

  await S.subscribe(u, 'individual-gold');
  q = await S.quotaFor(u);
  t('upgrade to gold: 2 more slots', q.canList && q.limit === 3 && q.remaining === 2);
  t('switching leaves exactly one current plan',
    (await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ? AND status IN ('active','cancelled')", [u]))!.n === 1);

  await list(u); await list(u);
  t('gold full at 3', (await S.quotaFor(u)).reason === 'full');

  await S.subscribe(u, 'individual-bronze');
  q = await S.quotaFor(u);
  t('downgrade below usage: listings stay, but no new ones', q.used === 3 && !q.canList && q.remaining === 0);

  await db.run('UPDATE listings SET sold = 1 WHERE id = ?', [first]);
  t('a sold listing frees its slot', (await S.quotaFor(u)).used === 2);

  let blockedByDb = false;
  try {
    await db.run("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, 'dealer-gold', 'active', now())", [u]);
  } catch { blockedByDb = true; }
  t('database itself refuses a second current plan', blockedByDb);

  console.log('\nlisting period');
  const v = await newUser('expiry@test');
  await S.subscribe(v, 'individual-silver');
  const expiring = await list(v);
  const before = (await searchListings({ per_page: 60 })).total;
  await shift('listings', 'expires_at', expiring, '-1 day');
  t('expired listing leaves public search', (await searchListings({ per_page: 60 })).total === before - 1);
  t('expired listing frees its slot', (await S.quotaFor(v)).used === 0);

  const renewed = await S.renewListing(v, expiring);
  const row = await db.get<{ ok: boolean }>("SELECT expires_at > now() + interval '29 days' AS ok FROM listings WHERE id = ?", [expiring]);
  t('renew brings it back for 30 days', renewed.ok && row?.ok === true && (await searchListings({ per_page: 60 })).total === before);

  await list(v);
  const third = await list(v, "now() - interval '1 day'");
  const blocked = await S.renewListing(v, third);
  t('renewing an expired listing needs a free slot', !blocked.ok && blocked.reason === 'full');
  t('extending a live listing needs no free slot', (await S.renewListing(v, expiring)).ok);
  t("cannot renew someone else's listing", (await S.renewListing(u, expiring)).ok === false);

  console.log('\ncancel, resume and roll-over');
  const w = await newUser('cancel@test');
  await S.subscribe(w, 'dealer-silver');
  t('cancel stops renewal', await S.cancelSubscription(w));
  let sub = await S.currentSubscription(w);
  t('cancelled plan still works until period end', sub?.status === 'cancelled' && (await S.quotaFor(w)).canList);
  t('resume restores renewal', (await S.resumeSubscription(w)) && (await S.currentSubscription(w))?.status === 'active');

  await S.cancelSubscription(w);
  await shift('subscriptions', 'current_period_end', w, '-1 hour', 'user_id');
  t('cancelled plan ends after its period', (await S.currentSubscription(w)) === null && (await S.quotaFor(w)).reason === 'no-plan');
  t('ended plan cannot be resumed', !(await S.resumeSubscription(w)));
  await S.subscribe(w, 'individual-bronze');
  t('can subscribe again after a plan ends', (await S.currentSubscription(w))?.plan.id === 'individual-bronze');

  const x = await newUser('rollover@test');
  await S.subscribe(x, 'dealer-bronze');
  await shift('subscriptions', 'current_period_end', x, '-65 days', 'user_id');
  sub = await S.currentSubscription(x);
  const left = sub && S.daysUntil(sub.current_period_end);
  t('active plan rolls forward past a lapsed period', left !== null && left! > 0 && left! <= 30, `days left ${left}`);

  console.log('\nseeded demo account');
  const demo = (await db.get<{ id: number }>("SELECT id FROM users WHERE email = 'demo@fleetmarketplace.com'"))!.id;
  const dq = await S.quotaFor(demo);
  t('demo seller is on silver with 1 of 2 slots used',
    dq.subscription?.plan.id === 'individual-silver' && dq.used === 1 && dq.remaining === 1,
    JSON.stringify({ plan: dq.subscription?.plan.id, used: dq.used }));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
