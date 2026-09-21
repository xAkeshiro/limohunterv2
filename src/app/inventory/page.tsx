import Link from 'next/link';
import type { Metadata } from 'next';
import ListingCard from '@/components/ListingCard';
import FilterSidebar from '@/components/FilterSidebar';
import Pagination from '@/components/Pagination';
import CompareBar from '@/components/CompareBar';
import SortSelect from '@/components/SortSelect';
import { getFacets, searchListings } from '@/lib/queries';
import type { ListingFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inventory',
  description:
    'Browse used limousines, SUV stretches, sprinter vans, shuttle buses and motorcoaches for sale across the US.',
};

type SearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const cleaned = list.filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function asNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function asString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw || undefined;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters: ListingFilters = {
    q: asString(sp.q),
    body_style: asArray(sp.body_style),
    make: asArray(sp.make),
    state: asArray(sp.state),
    condition: asArray(sp.condition),
    min_price: asNumber(sp.min_price),
    max_price: asNumber(sp.max_price),
    min_year: asNumber(sp.min_year),
    max_year: asNumber(sp.max_year),
    max_mileage: asNumber(sp.max_mileage),
    min_passengers: asNumber(sp.min_passengers),
    sort: asString(sp.sort),
    page: asNumber(sp.page) ?? 1,
    per_page: 12,
  };

  const results = searchListings(filters);
  const facets = getFacets();

  // Query string used by pagination links, with `page` stripped out.
  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === 'page' || value === undefined) continue;
    const list = Array.isArray(value) ? value : [value];
    list.filter(Boolean).forEach((v) => base.append(key, v));
  }

  const from = (results.page - 1) * results.perPage + 1;
  const to = Math.min(results.page * results.perPage, results.total);

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Inventory</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl">
          {filters.q ? `Results for “${filters.q}”` : 'Vehicle inventory'}
        </h1>
        <p className="mt-2 text-slate-400">
          {results.total === 0
            ? 'No vehicles match your filters yet.'
            : `Showing ${from}–${to} of ${results.total} vehicles for sale.`}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <FilterSidebar facets={facets} />

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {results.total} vehicle{results.total === 1 ? '' : 's'}
            </p>
            <SortSelect />
          </div>

          {results.items.length === 0 ? (
            <div className="card p-10 text-center">
              <h2 className="text-lg">Nothing matched those filters</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Try widening your price range, removing a vehicle type, or clearing the filters
                to see the full inventory.
              </p>
              <Link href="/inventory" className="btn-primary mt-5">
                Clear all filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          <Pagination page={results.page} pages={results.pages} baseQuery={base.toString()} />
        </section>
      </div>

      <CompareBar />
    </div>
  );
}
