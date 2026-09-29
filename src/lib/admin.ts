import { redirect } from 'next/navigation';
import { getDb } from './db';
import { currentUser } from './auth';
import { getPlan } from './plans';
import { parseListing, type Listing, type ListingView, type User } from './types';

/**
 * Gate for every /admin route. Non-admins are sent away rather than shown a
 * partial page, so admin data never renders for a member session.
 */
export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/account');
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.role === 'admin';
}

export interface AdminListingFilters {
  q?: string;
  status?: string;
  body_style?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

const ADMIN_SORTS: Record<string, string> = {
  newest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC',
  price_desc: 'price DESC',
  price_asc: 'price ASC',
  views_desc: 'views DESC',
  title: 'title ASC',
};

/** Unlike the public search, this sees every status including drafts and expired. */
export async function adminListings(f: AdminListingFilters = {}) {
  const db = await getDb();
  const perPage = Math.min(Math.max(f.per_page ?? 20, 1), 100);
  const page = Math.max(f.page ?? 1, 1);

  const clauses: string[] = ['TRUE'];
  const params: unknown[] = [];

  if (f.q) {
    clauses.push('(title ILIKE ? OR make ILIKE ? OR model ILIKE ? OR seller_name ILIKE ?)');
    const needle = `%${f.q}%`;
    params.push(needle, needle, needle, needle);
  }
  if (f.status && f.status !== 'all') {
    clauses.push('status = ?');
    params.push(f.status);
  }
  if (f.body_style && f.body_style !== 'all') {
    clauses.push('body_style = ?');
    params.push(f.body_style);
  }

  const where = clauses.join(' AND ');
  const orderBy = ADMIN_SORTS[f.sort ?? 'newest'] ?? ADMIN_SORTS.newest;

  const count = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM listings WHERE ${where}`, params);
  const rows = await db.all<Listing>(`SELECT * FROM listings WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [
    ...params,
    perPage,
    (page - 1) * perPage,
  ]);
  const total = count?.total ?? 0;

  return {
    items: rows.map(parseListing),
    total,
    page,
    perPage,
    pages: Math.max(Math.ceil(total / perPage), 1),
  };
}

export async function adminListingById(id: number): Promise<ListingView | null> {
  if (!Number.isInteger(id)) return null;
  const db = await getDb();
  const row = await db.get<Listing>('SELECT * FROM listings WHERE id = ?', [id]);
  return row ? parseListing(row) : null;
}

export interface AdminInquiry {
  id: number;
  listing_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  kind: string;
  created_at: string;
  listing_title: string | null;
  listing_slug: string | null;
}

export async function adminInquiries(limit = 100): Promise<AdminInquiry[]> {
  const db = await getDb();
  return db.all<AdminInquiry>(
    `SELECT i.*, l.title AS listing_title, l.slug AS listing_slug
     FROM inquiries i
     LEFT JOIN listings l ON l.id = i.listing_id
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT ?`,
    [limit],
  );
}

export interface AdminUser extends User {
  listing_count: number;
}

export async function adminUsers(): Promise<AdminUser[]> {
  const db = await getDb();
  return db.all<AdminUser>(
    `SELECT u.*, COUNT(l.id) AS listing_count
     FROM users u
     LEFT JOIN listings l ON l.seller_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
  );
}

export async function adminStats() {
  const db = await getDb();
  const row = await db.get<{
    listings: number; published: number; drafts: number; sold: number; featured: number;
    views: number; value: number;
  }>(
    `SELECT COUNT(*) AS listings,
            COUNT(*) FILTER (WHERE status = 'published') AS published,
            COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
            COUNT(*) FILTER (WHERE sold = 1) AS sold,
            COUNT(*) FILTER (WHERE featured = 1) AS featured,
            COALESCE(SUM(views), 0) AS views,
            COALESCE(SUM(price) FILTER (WHERE status = 'published'), 0) AS value
     FROM listings`,
  );
  const users = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  const inquiries = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM inquiries');

  return {
    listings: row?.listings ?? 0,
    published: row?.published ?? 0,
    drafts: row?.drafts ?? 0,
    sold: row?.sold ?? 0,
    featured: row?.featured ?? 0,
    views: row?.views ?? 0,
    value: row?.value ?? 0,
    users: users?.n ?? 0,
    inquiries: inquiries?.n ?? 0,
  };
}

export async function adminStatusOptions(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<{ status: string }>('SELECT DISTINCT status FROM listings ORDER BY status');
  return rows.map((r) => r.status);
}

/** Subscriptions still in their paid period, with revenue from renewing ones. */
export async function adminSubscriptionStats() {
  const db = await getDb();
  const rows = await db.all<{ plan_id: string; status: string }>(
    `SELECT plan_id, status FROM subscriptions
     WHERE status IN ('active', 'cancelled') AND current_period_end > now()`,
  );

  let mrr = 0;
  for (const r of rows) {
    if (r.status === 'active') mrr += getPlan(r.plan_id)?.price ?? 0;
  }
  return { active: rows.length, cancelling: rows.filter((r) => r.status === 'cancelled').length, mrr };
}
