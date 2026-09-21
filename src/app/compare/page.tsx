import Link from 'next/link';
import type { Metadata } from 'next';
import { getListingsByIds } from '@/lib/queries';
import { money, miles } from '@/lib/format';
import ClearCompare from '@/components/ClearCompare';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare vehicles',
  description: 'Compare used limousines and livery vehicles side by side on price, mileage, capacity and equipment.',
};

const ROWS: { label: string; get: (l: ReturnType<typeof getListingsByIds>[number]) => string }[] = [
  { label: 'Price', get: (l) => money(l.price) },
  { label: 'Year', get: (l) => String(l.year) },
  { label: 'Make', get: (l) => l.make },
  { label: 'Model', get: (l) => l.model },
  { label: 'Vehicle type', get: (l) => l.body_style },
  { label: 'Mileage', get: (l) => miles(l.mileage) },
  { label: 'Passengers', get: (l) => String(l.passengers) },
  { label: 'Condition', get: (l) => l.condition },
  { label: 'Fuel', get: (l) => l.fuel },
  { label: 'Drivetrain', get: (l) => l.drivetrain },
  { label: 'Exterior', get: (l) => l.exterior_color },
  { label: 'Interior', get: (l) => l.interior_color },
  { label: 'Location', get: (l) => `${l.city}, ${l.state}` },
  { label: 'Features', get: (l) => (l.features.length ? l.features.join(', ') : '—') },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.ids) ? sp.ids[0] : sp.ids;

  const ids = (raw ?? '')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4);

  const listings = getListingsByIds(ids);

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Compare</span>
      </nav>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Compare vehicles</h1>
          <p className="mt-2 text-slate-400">
            Line up to four vehicles side by side before you commit.
          </p>
        </div>
        {listings.length > 0 && <ClearCompare />}
      </header>

      {listings.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="text-lg">No vehicles selected yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Browse the inventory and choose <strong className="text-slate-200">Compare</strong> on
            any listing. Your selections appear here.
          </p>
          <Link href="/inventory" className="btn-primary mt-5">Browse inventory</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">Side-by-side vehicle comparison</caption>
            <thead>
              <tr>
                <th scope="col" className="w-40 p-3 text-left align-bottom">
                  <span className="sr-only">Specification</span>
                </th>
                {listings.map((l) => (
                  <th key={l.id} scope="col" className="p-3 align-bottom">
                    <Link href={`/listing/${l.slug}`} className="group block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.images[0] ?? '/img/placeholder.svg'}
                        alt={l.title}
                        className="aspect-[16/10] w-full rounded-lg border border-ink-line object-cover"
                      />
                      <span className="mt-2 block text-left text-sm font-semibold text-white group-hover:text-brand-200">
                        {l.title}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-ink-soft/40' : ''}>
                  <th scope="row" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {row.label}
                  </th>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 align-top text-sm text-slate-200">
                      {row.get(l)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="p-3" />
                {listings.map((l) => (
                  <td key={l.id} className="p-3">
                    <Link href={`/listing/${l.slug}`} className="btn-primary w-full">
                      View listing
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
