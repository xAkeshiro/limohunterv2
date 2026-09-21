import Link from 'next/link';
import { adminInquiries, adminListings, adminStats } from '@/lib/admin';
import { money, shortDate } from '@/lib/format';
import StatusPill from '@/components/admin/StatusPill';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const s = adminStats();
  const recent = adminListings({ per_page: 6, sort: 'newest' }).items;
  const inquiries = adminInquiries(5);

  const tiles = [
    { label: 'Total listings', value: s.listings, href: '/admin/listings' },
    { label: 'Published', value: s.published, href: '/admin/listings?status=published' },
    { label: 'Drafts', value: s.drafts, href: '/admin/listings?status=draft' },
    { label: 'Featured', value: s.featured, href: '/admin/listings' },
    { label: 'Marked sold', value: s.sold, href: '/admin/listings' },
    { label: 'Registered users', value: s.users, href: '/admin/users' },
    { label: 'Inquiries', value: s.inquiries, href: '/admin/inquiries' },
    { label: 'Total listing views', value: s.views, href: '/admin/listings?sort=views_desc' },
  ];

  return (
    <div>
      <h2 className="text-xl">Dashboard</h2>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card p-4 transition-colors hover:border-brand-300/50">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{t.label}</dt>
            <dd className="mt-1.5 text-2xl font-bold text-white">{t.value.toLocaleString()}</dd>
          </Link>
        ))}
      </dl>

      <div className="card mt-4 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Published inventory value</p>
        <p className="mt-1.5 text-3xl font-bold text-brand-300">{money(s.value)}</p>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Recently added</h3>
          <Link href="/admin/listings" className="text-sm font-medium text-brand-300 hover:text-brand-200">
            Manage all →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-2.5 pr-4">Vehicle</th>
                <th scope="col" className="py-2.5 pr-4">Price</th>
                <th scope="col" className="py-2.5 pr-4">Status</th>
                <th scope="col" className="py-2.5 pr-4">Views</th>
                <th scope="col" className="py-2.5">Added</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((l) => (
                <tr key={l.id} className="border-b border-ink-line/60">
                  <td className="py-2.5 pr-4">
                    <Link href={`/admin/listings/${l.id}/edit`} className="font-medium text-slate-100 hover:text-brand-200">
                      {l.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-300">{money(l.price)}</td>
                  <td className="py-2.5 pr-4"><StatusPill status={l.status} /></td>
                  <td className="py-2.5 pr-4 text-slate-300">{l.views}</td>
                  <td className="py-2.5 text-slate-400">{shortDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Latest inquiries</h3>
          <Link href="/admin/inquiries" className="text-sm font-medium text-brand-300 hover:text-brand-200">
            View all →
          </Link>
        </div>

        {inquiries.length === 0 ? (
          <p className="card mt-4 p-6 text-sm text-slate-400">No inquiries received yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {inquiries.map((i) => (
              <li key={i.id} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-100">
                    {i.name} <span className="text-sm font-normal text-slate-500">· {i.email}</span>
                  </p>
                  <span className="text-xs text-slate-500">{shortDate(i.created_at)}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{i.message}</p>
                {i.listing_title && (
                  <p className="mt-1.5 text-xs text-slate-500">Re: {i.listing_title}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
