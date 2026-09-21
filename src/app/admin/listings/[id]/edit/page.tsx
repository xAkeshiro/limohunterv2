import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { adminListingById } from '@/lib/admin';
import { adminDeleteListing } from '@/lib/admin-actions';
import AdminListingForm from '@/components/admin/AdminListingForm';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import { shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit listing' };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = adminListingById(Number(id));
  if (!listing) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl">Edit listing</h2>
          <p className="mt-1 truncate text-sm text-slate-400">
            {listing.title} · added {shortDate(listing.created_at)} · {listing.views} views
          </p>
        </div>
        <form action={adminDeleteListing}>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="redirect" value="1" />
          <ConfirmDelete title={listing.title} label="Delete listing" />
        </form>
      </div>

      <div className="mt-6">
        <AdminListingForm listing={listing} />
      </div>
    </div>
  );
}
