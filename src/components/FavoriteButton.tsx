'use client';

import Link from 'next/link';
import { favorite } from '@/lib/actions';

export default function FavoriteButton({
  listingId,
  signedIn,
}: {
  listingId: number;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <Link href="/login" className="text-xs font-medium text-slate-400 hover:text-brand-200">
        Sign in to save
      </Link>
    );
  }

  return (
    <form action={favorite}>
      <input type="hidden" name="listing_id" value={listingId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brand-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 12 5.6 5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" />
        </svg>
        Save vehicle
      </button>
    </form>
  );
}
