import { getDb } from './db';
import { parseListing, type Listing, type ListingFilters, type ListingView } from './types';

const SORTS: Record<string, string> = {
  newest: 'l.created_at DESC, l.id DESC',
  price_asc: 'l.price ASC',
  price_desc: 'l.price DESC',
  year_desc: 'l.year DESC',
  year_asc: 'l.year ASC',
  mileage_asc: 'l.mileage ASC',
};

export interface ListingPage {
  items: ListingView[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

/**
 * Builds the shared WHERE clause for inventory search. Every value is bound as
 * a parameter, so user input never reaches the SQL text.
 */
function buildWhere(f: ListingFilters): { sql: string; params: unknown[] } {
  const clauses: string[] = ["l.status = 'published'"];
  const params: unknown[] = [];

  if (f.q) {
    clauses.push(
      '(l.title LIKE ? OR l.make LIKE ? OR l.model LIKE ? OR l.description LIKE ? OR l.body_style LIKE ?)',
    );
    const needle = `%${f.q}%`;
    params.push(needle, needle, needle, needle, needle);
  }

  const inList = (column: string, values?: string[]) => {
    if (!values || values.length === 0) return;
    clauses.push(`${column} IN (${values.map(() => '?').join(',')})`);
    params.push(...values);
  };

  inList('l.body_style', f.body_style);
  inList('l.make', f.make);
  inList('l.state', f.state);
  inList('l.condition', f.condition);

  const range = (column: string, value: number | undefined, op: '>=' | '<=') => {
    if (value === undefined || Number.isNaN(value)) return;
    clauses.push(`${column} ${op} ?`);
    params.push(value);
  };

  range('l.price', f.min_price, '>=');
  range('l.price', f.max_price, '<=');
  range('l.year', f.min_year, '>=');
  range('l.year', f.max_year, '<=');
  range('l.mileage', f.max_mileage, '<=');
  range('l.passengers', f.min_passengers, '>=');

  return { sql: clauses.join(' AND '), params };
}

export function searchListings(f: ListingFilters = {}): ListingPage {
  const db = getDb();
  const perPage = Math.min(Math.max(f.per_page ?? 12, 1), 60);
  const page = Math.max(f.page ?? 1, 1);
  const { sql, params } = buildWhere(f);
  const orderBy = SORTS[f.sort ?? 'newest'] ?? SORTS.newest;

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM listings l WHERE ${sql}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT l.* FROM listings l WHERE ${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    )
    .all(...params, perPage, (page - 1) * perPage) as Listing[];

  return {
    items: rows.map(parseListing),
    total,
    page,
    perPage,
    pages: Math.max(Math.ceil(total / perPage), 1),
  };
}

export function getListingBySlug(slug: string): ListingView | null {
  const row = getDb()
    .prepare("SELECT * FROM listings WHERE slug = ? AND status = 'published'")
    .get(slug) as Listing | undefined;
  return row ? parseListing(row) : null;
}

export function getListingsByIds(ids: number[]): ListingView[] {
  if (ids.length === 0) return [];
  const rows = getDb()
    .prepare(
      `SELECT * FROM listings WHERE id IN (${ids.map(() => '?').join(',')}) AND status = 'published'`,
    )
    .all(...ids) as Listing[];

  // Preserve the caller's ordering so compare columns stay where the user put them.
  const byId = new Map(rows.map((r) => [r.id, parseListing(r)]));
  return ids.map((id) => byId.get(id)).filter((r): r is ListingView => Boolean(r));
}

export function getFeatured(limit = 6): ListingView[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM listings WHERE status = 'published' AND featured = 1 ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as Listing[];
  return rows.map(parseListing);
}

export function getRecent(limit = 8): ListingView[] {
  const rows = getDb()
    .prepare("SELECT * FROM listings WHERE status = 'published' ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Listing[];
  return rows.map(parseListing);
}

export function getSimilar(listing: ListingView, limit = 3): ListingView[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM listings
       WHERE status = 'published' AND id != ? AND body_style = ?
       ORDER BY ABS(price - ?) ASC LIMIT ?`,
    )
    .all(listing.id, listing.body_style, listing.price, limit) as Listing[];
  return rows.map(parseListing);
}

export function incrementViews(id: number): void {
  getDb().prepare('UPDATE listings SET views = views + 1 WHERE id = ?').run(id);
}

/** Distinct values used to populate the inventory filter sidebar. */
export function getFacets() {
  const db = getDb();
  const column = (name: string) =>
    (
      db
        .prepare(
          `SELECT ${name} AS value, COUNT(*) AS count FROM listings
           WHERE status = 'published' GROUP BY ${name} ORDER BY count DESC, value ASC`,
        )
        .all() as { value: string; count: number }[]
    ).filter((r) => Boolean(r.value));

  const bounds = db
    .prepare(
      `SELECT MIN(price) AS minPrice, MAX(price) AS maxPrice,
              MIN(year) AS minYear, MAX(year) AS maxYear
       FROM listings WHERE status = 'published'`,
    )
    .get() as { minPrice: number; maxPrice: number; minYear: number; maxYear: number };

  return {
    bodyStyles: column('body_style'),
    makes: column('make'),
    states: column('state'),
    conditions: column('condition'),
    bounds: bounds ?? { minPrice: 0, maxPrice: 0, minYear: 0, maxYear: 0 },
  };
}

export function countByBodyStyle(): { value: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT body_style AS value, COUNT(*) AS count FROM listings
       WHERE status = 'published' GROUP BY body_style ORDER BY count DESC`,
    )
    .all() as { value: string; count: number }[];
}

export function stats() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS listings,
              COUNT(DISTINCT make)  AS makes,
              COUNT(DISTINCT state) AS states
       FROM listings WHERE status = 'published'`,
    )
    .get() as { listings: number; makes: number; states: number };
  const sellers = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return { ...row, sellers: sellers.n };
}

export function listingsForUser(userId: number): ListingView[] {
  const rows = getDb()
    .prepare('SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC')
    .all(userId) as Listing[];
  return rows.map(parseListing);
}

export function favoritesForUser(userId: number): ListingView[] {
  const rows = getDb()
    .prepare(
      `SELECT l.* FROM listings l
       JOIN favorites f ON f.listing_id = l.id
       WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    )
    .all(userId) as Listing[];
  return rows.map(parseListing);
}

export function toggleFavorite(userId: number, listingId: number): boolean {
  const db = getDb();
  const existing = db
    .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?')
    .get(userId, listingId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(userId, listingId);
    return false;
  }
  db.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)').run(userId, listingId);
  return true;
}

export function saveInquiry(input: {
  listingId: number | null;
  name: string;
  email: string;
  phone?: string;
  message: string;
  kind?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO inquiries (listing_id, name, email, phone, message, kind)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.listingId,
      input.name,
      input.email,
      input.phone ?? null,
      input.message,
      input.kind ?? 'listing',
    );
}
