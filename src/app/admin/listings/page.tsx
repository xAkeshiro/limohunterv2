import Link from 'next/link';
import { adminListings, adminStatusOptions } from '@/lib/admin';
import { adminDeleteListing, adminToggleFlag } from '@/lib/admin-actions';
import { money, miles, shortDate } from '@/lib/format';
import AdminListingFilters from '@/components/admin/AdminListingFilters';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import StatusSelect from '@/components/admin/StatusSelect';


export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

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
  const pageHref = (n: number) => `/admin/listings?${query.toString()}${query.toString() ? '&' : ''}page=${n}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Listings</h2>
          <p className="mt-1 text-sm text-slate-400">
            {results.total} listing{results.total === 1 ? '' : 's'} across all statuses.
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
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-3 pr-3">Vehicle</th>
                <th scope="col" className="py-3 pr-3">Price</th>
                <th scope="col" className="py-3 pr-3">Mileage</th>
                <th scope="col" className="py-3 pr-3">Status</th>
                <th scope="col" className="py-3 pr-3">Flags</th>
                <th scope="col" className="py-3 pr-3">Views</th>
                <th scope="col" className="py-3 pr-3">Added</th>
                <th scope="col" className="py-3"><span className="sr-only">Actions</span></th>
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
                          {l.body_style} · {l.city}, {l.state} · {l.seller_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-300">{money(l.price)}</td>
                  <td className="py-3 pr-3 text-slate-300">{miles(l.mileage)}</td>
                  <td className="py-3 pr-3">
                    <StatusSelect id={l.id} status={l.status} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1.5">
                      <form action={adminToggleFlag}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="field" value="featured" />
                        <button
                          type="submit"
                          className={`text-xs font-semibold ${l.featured ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {l.featured ? '★ Featured' : '☆ Feature'}
                        </button>
                      </form>
                      <form action={adminToggleFlag}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="field" value="sold" />
                        <button
                          type="submit"
                          className={`text-xs font-semibold ${l.sold ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {l.sold ? 'Sold' : 'Mark sold'}
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-300">{l.views}</td>
                  <td className="py-3 pr-3 text-xs text-slate-400">{shortDate(l.created_at)}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={`/admin/listings/${l.id}/edit`}
                        className="text-xs font-semibold text-brand-300 hover:text-brand-200"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/listing/${l.slug}`}
                        className="text-xs font-medium text-slate-400 hover:text-slate-200"
                      >
                        View
                      </Link>
                      <form action={adminDeleteListing}>
                        <input type="hidden" name="id" value={l.id} />
                        <ConfirmDelete title={l.title} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          {results.page > 1 && <Link href={pageHref(results.page - 1)} className="btn-ghost px-3">Previous</Link>}
          <span className="text-sm text-slate-400">Page {results.page} of {results.pages}</span>
          {results.page < results.pages && <Link href={pageHref(results.page + 1)} className="btn-ghost px-3">Next</Link>}
        </nav>
      )}
    </div>
  );
}
