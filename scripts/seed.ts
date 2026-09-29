/**
 * Resets the database and reloads the sample inventory and demo accounts.
 *
 * Normally unnecessary: a fresh database seeds itself on first boot. Use this
 * to get back to a clean local state. It refuses to run against a hosted
 * database unless --yes is passed, because it deletes every row.
 */
import { connectionString, dbMode, getDb } from '../src/lib/db';
import { seedSampleData } from '../src/lib/seed';

function isLocal(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function run() {
  const url = connectionString();
  if (url && !isLocal(url) && !process.argv.includes('--yes')) {
    console.error('Refusing to reset a hosted database: this deletes every user, listing and subscription.');
    console.error('If that is really what you want, run: npm run seed -- --yes');
    process.exit(1);
  }

  const db = await getDb();
  await db.exec('TRUNCATE subscriptions, favorites, inquiries, listings, users, app_meta RESTART IDENTITY CASCADE');
  await db.transaction(async (tx) => {
    await seedSampleData(tx, { demoAccounts: true });
    await tx.run("INSERT INTO app_meta (key, value) VALUES ('sample_data_loaded', ?)", [new Date().toISOString()]);
  });

  const n = await db.get<{ listings: number; users: number }>(
    'SELECT (SELECT COUNT(*) FROM listings) AS listings, (SELECT COUNT(*) FROM users) AS users',
  );
  console.log(`seeded ${n?.listings} listings and ${n?.users} users (${dbMode()})`);
  console.log('demo logins: demo@fleetmarketplace.com / admin@fleetmarketplace.com, password demo1234');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
