import { getDb } from './db';
import { liveSql, parseListing, type Listing, type ListingFilters, type ListingView } from './types';

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
  const clauses: string[] = [liveSql('l')];
  const params: unknown[] = [];

  if (f.q) {
    // ILIKE: Postgres LIKE is case-sensitive, and searches should not be.
    clauses.push(
      '(l.title ILIKE ? OR l.make ILIKE ? OR l.model ILIKE ? OR l.description ILIKE ? OR l.body_style ILIKE ?)',
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

export async function searchListings(f: ListingFilters = {}): Promise<ListingPage> {
  const db = await getDb();
  const perPage = Math.min(Math.max(f.per_page ?? 12, 1), 60);
  const page = Math.max(f.page ?? 1, 1);
  const { sql, params } = buildWhere(f);
  const orderBy = SORTS[f.sort ?? 'newest'] ?? SORTS.newest;

  const count = await db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM listings l WHERE ${sql}`, params);
  const rows = await db.all<Listing>(
    `SELECT l.* FROM listings l WHERE ${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, perPage, (page - 1) * perPage],
  );
  const total = count?.total ?? 0;

  return {
    items: rows.map(parseListing),
    total,
    page,
    perPage,
    pages: Math.max(Math.ceil(total / perPage), 1),
  };
}

export async function getListingBySlug(slug: string): Promise<ListingView | null> {
  const db = await getDb();
  const row = await db.get<Listing>(`SELECT * FROM listings WHERE slug = ? AND ${liveSql()}`, [slug]);
  return row ? parseListing(row) : null;
}

export async function getListingsByIds(ids: number[]): Promise<ListingView[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db.all<Listing>(
    `SELECT * FROM listings WHERE id IN (${ids.map(() => '?').join(',')}) AND ${liveSql()}`,
    ids,
  );

  // Preserve the caller's ordering so compare columns stay where the user put them.
  const byId = new Map(rows.map((r) => [r.id, parseListing(r)]));
  return ids.map((id) => byId.get(id)).filter((r): r is ListingView => Boolean(r));
}

export async function getFeatured(limit = 6): Promise<ListingView[]> {
  const db = await getDb();
  const rows = await db.all<Listing>(
    `SELECT * FROM listings WHERE ${liveSql()} AND featured = 1 ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(parseListing);
}

export async function getRecent(limit = 8): Promise<ListingView[]> {
  const db = await getDb();
  const rows = await db.all<Listing>(`SELECT * FROM listings WHERE ${liveSql()} ORDER BY created_at DESC LIMIT ?`, [limit]);
  return rows.map(parseListing);
}

export async function getSimilar(listing: ListingView, limit = 3): Promise<ListingView[]> {
  const db = await getDb();
  const rows = await db.all<Listing>(
    `SELECT * FROM listings
     WHERE ${liveSql()} AND id <> ? AND body_style = ?
     ORDER BY ABS(price - ?::int) ASC LIMIT ?`,
    [listing.id, listing.body_style, listing.price, limit],
  );
  return rows.map(parseListing);
}

export async function incrementViews(id: number): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE listings SET views = views + 1 WHERE id = ?', [id]);
}

type Facet = { value: string; count: number };

/** Distinct values used to populate the inventory filter sidebar. */
export async function getFacets() {
  const db = await getDb();
  // Column names come from this fixed list, never from input.
  const column = async (name: 'body_style' | 'make' | 'state' | 'condition') =>
    (
      await db.all<Facet>(
        `SELECT ${name} AS value, COUNT(*) AS count FROM listings
         WHERE ${liveSql()} GROUP BY ${name} ORDER BY count DESC, value ASC`,
      )
    ).filter((r) => Boolean(r.value));

  const [bodyStyles, makes, states, conditions, bounds] = await Promise.all([
    column('body_style'),
    column('make'),
    column('state'),
    column('condition'),
    db.get<{ minPrice: number; maxPrice: number; minYear: number; maxYear: number }>(
      `SELECT MIN(price) AS "minPrice", MAX(price) AS "maxPrice",
              MIN(year) AS "minYear", MAX(year) AS "maxYear"
       FROM listings WHERE ${liveSql()}`,
    ),
  ]);

  return {
    bodyStyles,
    makes,
    states,
    conditions,
    bounds: {
      minPrice: bounds?.minPrice ?? 0,
      maxPrice: bounds?.maxPrice ?? 0,
      minYear: bounds?.minYear ?? 0,
      maxYear: bounds?.maxYear ?? 0,
    },
  };
}

export async function countByBodyStyle(): Promise<Facet[]> {
  const db = await getDb();
  return db.all<Facet>(
    `SELECT body_style AS value, COUNT(*) AS count FROM listings
     WHERE ${liveSql()} GROUP BY body_style ORDER BY count DESC`,
  );
}

export async function stats() {
  const db = await getDb();
  const row = await db.get<{ listings: number; makes: number; states: number }>(
    `SELECT COUNT(*) AS listings, COUNT(DISTINCT make) AS makes, COUNT(DISTINCT state) AS states
     FROM listings WHERE ${liveSql()}`,
  );
  const sellers = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  return { listings: row?.listings ?? 0, makes: row?.makes ?? 0, states: row?.states ?? 0, sellers: sellers?.n ?? 0 };
}

export async function listingsForUser(userId: number): Promise<ListingView[]> {
  const db = await getDb();
  const rows = await db.all<Listing>('SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(parseListing);
}

export async function favoritesForUser(userId: number): Promise<ListingView[]> {
  const db = await getDb();
  const rows = await db.all<Listing>(
    `SELECT l.* FROM listings l
     JOIN favorites f ON f.listing_id = l.id
     WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    [userId],
  );
  return rows.map(parseListing);
}

export async function toggleFavorite(userId: number, listingId: number): Promise<boolean> {
  const db = await getDb();
  const removed = await db.run('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]);
  if (removed.rowCount > 0) return false;
  await db.run('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, listingId]);
  return true;
}

export async function saveInquiry(input: {
  listingId: number | null;
  name: string;
  email: string;
  phone?: string;
  message: string;
  kind?: string;
}): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO inquiries (listing_id, name, email, phone, message, kind) VALUES (?, ?, ?, ?, ?, ?)`,
    [input.listingId, input.name, input.email, input.phone ?? null, input.message, input.kind ?? 'listing'],
  );
}
