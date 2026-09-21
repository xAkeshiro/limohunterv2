import Link from 'next/link';
import type { Metadata } from 'next';
import { adminInquiries } from '@/lib/admin';
import { adminDeleteInquiry } from '@/lib/admin-actions';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Inquiries' };

const KIND_LABEL: Record<string, string> = {
  listing: 'Vehicle enquiry',
  finance: 'Finance request',
  general: 'General message',
};

export default function AdminInquiriesPage() {
  const inquiries = adminInquiries(200);

  return (
    <div>
      <h2 className="text-xl">Inquiries</h2>
      <p className="mt-1 text-sm text-slate-400">
        {inquiries.length} message{inquiries.length === 1 ? '' : 's'} received through the site.
      </p>

      {inquiries.length === 0 ? (
        <p className="card mt-5 p-10 text-center text-sm text-slate-400">
          No inquiries yet. Messages sent from listing pages, the finance page and the contact
          form all arrive here.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {inquiries.map((i) => (
            <li key={i.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{i.name}</p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    <a href={`mailto:${i.email}`} className="hover:text-brand-200">{i.email}</a>
                    {i.phone ? ` · ${i.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="chip">{KIND_LABEL[i.kind] ?? i.kind}</span>
                  <span className="text-xs text-slate-500">{shortDate(i.created_at)}</span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {i.message}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-ink-line pt-3">
                {i.listing_slug ? (
                  <Link href={`/listing/${i.listing_slug}`} className="text-xs link-muted">
                    Re: {i.listing_title} →
                  </Link>
                ) : (
                  <span className="text-xs text-slate-600">No linked listing</span>
                )}
                <form action={adminDeleteInquiry}>
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" className="text-xs font-semibold text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
