import bcrypt from 'bcryptjs';
import type { Db } from './db';
import { slugify } from './format';
import { BILLING_DAYS } from './plans';
import { IMAGE_KEY, LISTINGS } from './seed-data';

const DEMO_PASSWORD = 'demo1234';

/**
 * Creates or promotes the administrator named by ADMIN_EMAIL / ADMIN_PASSWORD.
 * This is how a production database gets its first admin without a password
 * published anywhere. The password is only used when the account is created;
 * an existing account keeps its own.
 */
export async function ensureAdminFromEnv(db: Db): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || password.length < 8) return;

  const existing = await db.get<{ id: number; role: string }>('SELECT id, role FROM users WHERE email = ?', [email]);
  if (existing) {
    if (existing.role !== 'admin') await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [existing.id]);
    return;
  }
  await db.run("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')", [
    email,
    bcrypt.hashSync(password, 10),
    process.env.ADMIN_NAME?.trim() || 'Administrator',
  ]);
}

/**
 * The demo seller owns two listings under their plan: one live and one past
 * its listing period, so quotas and renewal are visible at once.
 */
const DEMO_LISTINGS: Record<string, number> = {
  '2015 Lincoln MKT 120" Stretch Limousine': 21,
  '2014 International 3200 Shuttle — 28 Passenger': -3,
};

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export async function seedSampleData(db: Db, { demoAccounts }: { demoAccounts: boolean }) {
  let adminId: number | null = null;
  let demoId: number | null = null;

  if (demoAccounts) {
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    const upsert = async (email: string, name: string, company: string, role: string) =>
      (
        await db.get<{ id: number }>(
          `INSERT INTO users (email, password_hash, name, company, phone, role)
           VALUES (?, ?, ?, ?, '253-314-7568', ?)
           ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
           RETURNING id`,
          [email, hash, name, company, role],
        )
      )!.id;
    demoId = await upsert('demo@fleetmarketplace.com', 'Demo Seller', 'Demo Coach Sales', 'member');
    adminId = await upsert('admin@fleetmarketplace.com', 'Alex Rivera', 'Fleet Marketplace', 'admin');
  } else {
    adminId = (await db.get<{ id: number }>("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"))?.id ?? null;
  }

  const sellers = [
    { name: 'Demo Coach Sales', phone: '253-314-7568' },
    { name: 'Fleet Marketplace Direct', phone: '253-314-7568' },
  ];

  for (const [index, row] of LISTINGS.entries()) {
    const key = IMAGE_KEY[row.body_style] ?? 'sedan';
    const display = sellers[index % sellers.length];
    const demoDays = demoAccounts ? DEMO_LISTINGS[row.title] : undefined;
    const isDemo = demoDays !== undefined;

    await db.run(
      `INSERT INTO listings (
         slug, title, body_style, make, model, year, price, mileage, passengers,
         condition, fuel, transmission, drivetrain, exterior_color, interior_color,
         city, state, description, features, images,
         seller_id, seller_name, seller_phone, featured, expires_at, created_at
       ) VALUES (
         @slug, @title, @body_style, @make, @model, @year, @price, @mileage, @passengers,
         @condition, @fuel, 'Automatic', @drivetrain, @exterior_color, @interior_color,
         @city, @state, @description, @features, @images,
         @seller_id, @seller_name, @seller_phone, @featured, @expires_at, @created_at
       )
       ON CONFLICT (slug) DO NOTHING`,
      {
        slug: slugify(`${row.year}-${row.make}-${row.model}-${row.body_style}-${index + 1}`),
        title: row.title,
        body_style: row.body_style,
        make: row.make,
        model: row.model,
        year: row.year,
        price: row.price,
        mileage: row.mileage,
        passengers: row.passengers,
        condition: row.condition ?? 'Used',
        fuel: row.fuel ?? 'Gasoline',
        drivetrain: row.drivetrain ?? 'RWD',
        exterior_color: row.exterior_color ?? 'Black',
        interior_color: row.interior_color ?? 'Black',
        city: row.city,
        state: row.state,
        description: row.description,
        features: JSON.stringify(row.features),
        images: JSON.stringify([1, 2, 3, 4].map((n) => `/img/${key}-${n}.svg`)),
        seller_id: isDemo ? demoId : adminId,
        seller_name: isDemo ? 'Demo Coach Sales' : display.name,
        seller_phone: display.phone,
        featured: row.featured && !isDemo ? 1 : 0,
        expires_at: isDemo ? daysFromNow(demoDays) : null,
        created_at: isDemo ? daysFromNow(demoDays - 30) : daysFromNow(-index * 1.5),
      },
    );
  }

  if (demoAccounts && demoId) {
    // Demo seller is on individual Silver: 2 slots, 1 in use.
    await db.run(
      `INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_end)
       SELECT ?, 'individual-silver', 'active', now() - interval '9 days', now() + interval '${BILLING_DAYS - 9} days'
       WHERE NOT EXISTS (
         SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active', 'cancelled')
       )`,
      [demoId, demoId],
    );
  }
}
