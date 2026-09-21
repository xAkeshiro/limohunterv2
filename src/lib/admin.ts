import { redirect } from 'next/navigation';
import { getDb } from './db';
import { currentUser } from './auth';
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

/** Unlike the public search, this sees every status including drafts and sold. */
export function adminListings(f: AdminListingFilters = {}) {
  const db = getDb();
  const perPage = Math.min(Math.max(f.per_page ?? 20, 1), 100);
  const page = Math.max(f.page ?? 1, 1);

  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (f.q) {
    clauses.push('(title LIKE ? OR make LIKE ? OR model LIKE ? OR seller_name LIKE ?)');
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

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM listings WHERE ${where}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(`SELECT * FROM listings WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage) as Listing[];

  return {
    items: rows.map(parseListing),
    total,
    page,
    perPage,
    pages: Math.max(Math.ceil(total / perPage), 1),
  };
}

export function adminListingById(id: number): ListingView | null {
  const row = getDb().prepare('SELECT * FROM listings WHERE id = ?').get(id) as Listing | undefined;
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

export function adminInquiries(limit = 100): AdminInquiry[] {
  return getDb()
    .prepare(
      `SELECT i.*, l.title AS listing_title, l.slug AS listing_slug
       FROM inquiries i
       LEFT JOIN listings l ON l.id = i.listing_id
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ?`,
    )
    .all(limit) as AdminInquiry[];
}

export interface AdminUser extends User {
  listing_count: number;
}

export function adminUsers(): AdminUser[] {
  return getDb()
    .prepare(
      `SELECT u.*, COUNT(l.id) AS listing_count
       FROM users u
       LEFT JOIN listings l ON l.seller_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
    )
    .all() as AdminUser[];
}

export function adminStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;

  return {
    listings: one('SELECT COUNT(*) n FROM listings'),
    published: one("SELECT COUNT(*) n FROM listings WHERE status = 'published'"),
    drafts: one("SELECT COUNT(*) n FROM listings WHERE status = 'draft'"),
    sold: one('SELECT COUNT(*) n FROM listings WHERE sold = 1'),
    featured: one('SELECT COUNT(*) n FROM listings WHERE featured = 1'),
    users: one('SELECT COUNT(*) n FROM users'),
    inquiries: one('SELECT COUNT(*) n FROM inquiries'),
    views: one('SELECT COALESCE(SUM(views), 0) n FROM listings'),
    value: (
      db.prepare("SELECT COALESCE(SUM(price), 0) n FROM listings WHERE status='published'").get() as {
        n: number;
      }
    ).n,
  };
}

export function adminStatusOptions(): string[] {
  const rows = getDb()
    .prepare('SELECT DISTINCT status FROM listings ORDER BY status')
    .all() as { status: string }[];
  return rows.map((r) => r.status);
}
