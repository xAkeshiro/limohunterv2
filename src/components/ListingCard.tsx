import Link from 'next/link';
import type { ListingView } from '@/lib/types';
import { money, miles } from '@/lib/format';
import CompareToggle from './CompareToggle';

export default function ListingCard({ listing }: { listing: ListingView }) {
  const image = listing.images[0] ?? '/img/placeholder.svg';

  return (
    <article className="card group overflow-hidden transition-colors hover:border-brand-300/50">
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {listing.featured === 1 && (
            <span className="absolute left-3 top-3 rounded-md bg-brand-300 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
              Featured
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-md bg-ink/85 px-2 py-1 text-[11px] font-semibold text-slate-200">
            {listing.body_style}
          </span>
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/listing/${listing.slug}`}>
          <h3 className="line-clamp-2 text-base font-semibold text-white group-hover:text-brand-200">
            {listing.title}
          </h3>
        </Link>

        <p className="mt-2 text-xl font-bold text-brand-300">{money(listing.price)}</p>

        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-line pt-3 text-xs text-slate-400">
          <div>
            <dt className="sr-only">Mileage</dt>
            <dd className="font-medium text-slate-200">{miles(listing.mileage)}</dd>
          </div>
          <div>
            <dt className="sr-only">Passengers</dt>
            <dd className="font-medium text-slate-200">{listing.passengers} pass.</dd>
          </div>
          <div>
            <dt className="sr-only">Location</dt>
            <dd className="truncate font-medium text-slate-200">{listing.state}</dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {listing.city}, {listing.state}
          </span>
          <CompareToggle id={listing.id} />
        </div>
      </div>
    </article>
  );
}
