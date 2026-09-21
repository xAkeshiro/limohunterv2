import Link from 'next/link';
import { adminDeleteListing } from '@/lib/admin-actions';
import ConfirmDelete from './ConfirmDelete';

/**
 * Kept in one place so the table and the card list cannot drift apart on what
 * actions a listing offers.
 */
export default function ListingRowActions({
  id,
  slug,
  title,
}: {
  id: number;
  slug: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/listings/${id}/edit`}
        className="btn-primary px-3 py-1.5 text-xs"
        aria-label={`Edit ${title}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Edit
      </Link>

      <Link
        href={`/listing/${slug}`}
        className="rounded-lg border border-ink-line px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-300 hover:text-brand-200"
      >
        View
      </Link>

      <form action={adminDeleteListing}>
        <input type="hidden" name="id" value={id} />
        <ConfirmDelete title={title} />
      </form>
    </div>
  );
}
