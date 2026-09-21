import Link from 'next/link';
import { adminListings, adminStatusOptions } from '@/lib/admin';
import { adminToggleFlag } from '@/lib/admin-actions';
import { money, miles, shortDate } from '@/lib/format';
import AdminListingFilters from '@/components/admin/AdminListingFilters';
import StatusSelect from '@/components/admin/StatusSelect';
import StatusPill from '@/components/admin/StatusPill';
import ListingRowActions from '@/components/admin/ListingRowActions';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

function FlagButtons({ id, featured, sold }: { id: number; featured: number; sold: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <form action={adminToggleFlag}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="field" value="featured" />
        <button
          type="submit"
          className={`whitespace-nowrap text-xs font-semibold ${featured ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {featured ? '★ Featured' : '☆ Feature'}
        </button>
      </form>
      <form action={adminToggleFlag}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="field" value="sold" />
        <button
          type="submit"
          className={`whitespace-nowrap text-xs font-semibold ${sold ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {sold ? 'Sold' : 'Mark sold'}
        </button>
      </form>
    </div>
  );
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Number(one(sp.page) ?? 1) || 1;

  const results = adminListings({
    q: one(sp.q),
    status: one(sp.status),
    body_style: one(sp.body_style),
    sort: one(sp.sort),
    page,
    per_page: 20,
  });

  const statuses = adminStatusOptions();

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'page' || v === undefined) continue;
    (Array.isArray(v) ? v : [v]).filter(Boolean).forEach((x) => query.append(k, x));
  }
  const pageHref = (n: number) =>
    `/admin/listings?${query.toString()}${query.toString() ? '&' : ''}page=${n}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Listings</h2>
          <p className="mt-1 text-sm text-slate-400">
            {results.total} listing{results.total === 1 ? '' : 's'} across all statuses. Select{' '}
            <strong className="text-slate-200">Edit</strong> on any row to change its title,
            description, specification or photos.
          </p>
        </div>
        <Link href="/admin/listings/new" className="btn-primary">Add listing</Link>
      </div>

      <div className="mt-5">
        <AdminListingFilters statuses={statuses} />
      </div>

      {results.items.length === 0 ? (
        <div className="card mt-5 p-10 text-center">
          <p className="text-sm text-slate-400">No listings match those filters.</p>
          <Link href="/admin/listings" className="btn-ghost mt-4">Clear filters</Link>
        </div>
      ) : (
        <>
          {/* Cards below lg, where a table cannot show actions without scrolling. */}
          <ul className="mt-5 space-y-3 lg:hidden">
            {results.items.map((l) => (
              <li key={l.id} className="card p-4">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.images[0] ?? '/img/placeholder.svg'}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded border border-ink-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/listings/${l.id}/edit`}
                      className="font-medium text-slate-100 hover:text-brand-200"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.body_style} · {l.city}, {l.state}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-300">
                      {money(l.price)}{' '}
                      <span className="font-normal text-slate-500">· {miles(l.mileage)}</span>
                    </p>
                  </div>
                  <StatusPill status={l.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-line pt-3">
                  <FlagButtons id={l.id} featured={l.featured} sold={l.sold} />
                  <ListingRowActions id={l.id} slug={l.slug} title={l.title} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-3 pr-3">Vehicle</th>
                  <th scope="col" className="py-3 pr-3">Price</th>
                  <th scope="col" className="hidden py-3 pr-3 2xl:table-cell">Mileage</th>
                  <th scope="col" className="py-3 pr-3">Status</th>
                  <th scope="col" className="py-3 pr-3">Flags</th>
                  <th scope="col" className="hidden py-3 pr-3 xl:table-cell">Views</th>
                  <th scope="col" className="hidden py-3 pr-3 2xl:table-cell">Added</th>
                  {/* Pinned so the actions stay reachable if the table ever scrolls. */}
                  <th scope="col" className="sticky right-0 bg-ink py-3 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.items.map((l) => (
                  <tr key={l.id} className="border-b border-ink-line/60 align-top">
                    <td className="py-3 pr-3">
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={l.images[0] ?? '/img/placeholder.svg'}
                          alt=""
                          className="h-11 w-16 shrink-0 rounded border border-ink-line object-cover"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/listings/${l.id}/edit`}
                            className="font-medium text-slate-100 hover:text-brand-200"
                          >
                            {l.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {l.body_style} · {l.city}, {l.state}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-slate-300">{money(l.price)}</td>
                    <td className="hidden whitespace-nowrap py-3 pr-3 text-slate-300 2xl:table-cell">
                      {miles(l.mileage)}
                    </td>
                    <td className="py-3 pr-3"><StatusSelect id={l.id} status={l.status} /></td>
                    <td className="py-3 pr-3">
                      <FlagButtons id={l.id} featured={l.featured} sold={l.sold} />
                    </td>
                    <td className="hidden py-3 pr-3 text-slate-300 xl:table-cell">{l.views}</td>
                    <td className="hidden whitespace-nowrap py-3 pr-3 text-xs text-slate-400 2xl:table-cell">
                      {shortDate(l.created_at)}
                    </td>
                    <td className="sticky right-0 bg-ink py-3 pl-3">
                      <ListingRowActions id={l.id} slug={l.slug} title={l.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {results.pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          {results.page > 1 && (
            <Link href={pageHref(results.page - 1)} className="btn-ghost px-3">Previous</Link>
          )}
          <span className="text-sm text-slate-400">
            Page {results.page} of {results.pages}
          </span>
          {results.page < results.pages && (
            <Link href={pageHref(results.page + 1)} className="btn-ghost px-3">Next</Link>
          )}
        </nav>
      )}
    </div>
  );
}
