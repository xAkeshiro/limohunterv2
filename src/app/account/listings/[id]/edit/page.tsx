import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ListingForm from '@/components/ListingForm';
import { currentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { uploadMode } from '@/lib/storage';
import { parseListing, type Listing } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit listing', robots: { index: false } };

export default async function EditMyListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/account/listings/${id}/edit`)}`);

  const listingId = Number(id);
  const db = await getDb();
  // Scoped to the signed-in seller: someone else's listing is simply not found.
  const row = Number.isInteger(listingId)
    ? await db.get<Listing>('SELECT * FROM listings WHERE id = ? AND seller_id = ?', [listingId, user.id])
    : undefined;
  if (!row) notFound();
  const listing = parseListing(row);

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/account" className="link-muted">My account</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Edit listing</span>
      </nav>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Edit listing</h1>
          <p className="mt-2 text-slate-400">{listing.title}</p>
        </div>
        <Link href={`/listing/${listing.slug}`} className="btn-ghost">View on site</Link>
      </header>
      <div className="max-w-3xl">
        <ListingForm uploadMode={uploadMode()} listing={listing} />
      </div>
    </div>
  );
}
