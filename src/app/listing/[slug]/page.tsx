import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Gallery from '@/components/Gallery';
import ListingCard from '@/components/ListingCard';
import InquiryForm from '@/components/InquiryForm';
import FinanceCalculator from '@/components/FinanceCalculator';
import CompareToggle from '@/components/CompareToggle';
import CompareBar from '@/components/CompareBar';
import FavoriteButton from '@/components/FavoriteButton';
import { getListingBySlug, getSimilar, incrementViews } from '@/lib/queries';
import { currentUser } from '@/lib/auth';
import { money, miles, shortDate } from '@/lib/format';
import { withPhotos, withPhotosAll } from '@/lib/photos';
import PhotoCredits from '@/components/PhotoCredits';
import { isRepresentative } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = getListingBySlug(slug);
  if (!found) return { title: 'Listing not found' };
  const listing = await withPhotos(found);

  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: listing.images[0] ? [listing.images[0]] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = getListingBySlug(slug);
  if (!found) notFound();

  incrementViews(found.id);
  const [listing, similar] = await Promise.all([
    withPhotos(found),
    withPhotosAll(getSimilar(found, 3)),
  ]);
  const user = await currentUser();

  const specs: [string, string][] = [
    ['Year', String(listing.year)],
    ['Make', listing.make],
    ['Model', listing.model],
    ['Vehicle type', listing.body_style],
    ['Mileage', miles(listing.mileage)],
    ['Passenger capacity', `${listing.passengers}`],
    ['Condition', listing.condition],
    ['Fuel', listing.fuel],
    ['Transmission', listing.transmission],
    ['Drivetrain', listing.drivetrain],
    ['Exterior color', listing.exterior_color],
    ['Interior color', listing.interior_color],
    ['Location', `${listing.city}, ${listing.state}`],
    ['Listed', shortDate(listing.created_at)],
  ];

  // Structured data helps the listing surface correctly in search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: listing.title,
    vehicleModelDate: String(listing.year),
    brand: { '@type': 'Brand', name: listing.make },
    model: listing.model,
    vehicleSeatingCapacity: listing.passengers,
    image: listing.images.filter((src) => /^https?:/.test(src)),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.mileage, unitCode: 'SMI' },
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'USD',
      availability: listing.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  };

  return (
    <div className="wrap py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/inventory" className="link-muted">Inventory</Link>
        <span className="mx-2">/</span>
        <Link
          href={`/inventory?body_style=${encodeURIComponent(listing.body_style)}`}
          className="link-muted"
        >
          {listing.body_style}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <Gallery images={listing.images} alt={listing.title} />
          <PhotoCredits
            credits={listing.image_credits}
            representative={isRepresentative(listing)}
            vehicle={`${listing.make} ${listing.model}`}
          />

          <section className="mt-8">
            <h2 className="text-xl">Vehicle description</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-300">
              {listing.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Specifications</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
              {specs.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-ink-line py-2.5 text-sm"
                >
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-medium text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {listing.features.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl">Equipment &amp; features</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {listing.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#e6bf57" strokeWidth="2.5"
                      className="mt-0.5 shrink-0" aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="chip">{listing.body_style}</span>
              {listing.featured === 1 && (
                <span className="rounded-md bg-brand-300 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                  Featured
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl leading-snug">{listing.title}</h1>
            <p className="mt-3 text-3xl font-bold text-brand-300">{money(listing.price)}</p>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-ink-line py-4 text-center">
              {[
                ['Mileage', miles(listing.mileage)],
                ['Capacity', `${listing.passengers} pass.`],
                ['Year', String(listing.year)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 space-y-1.5 text-sm">
              <p className="text-slate-400">
                Seller: <span className="font-medium text-slate-200">{listing.seller_name}</span>
              </p>
              <p className="text-slate-400">
                Location:{' '}
                <span className="font-medium text-slate-200">
                  {listing.city}, {listing.state}
                </span>
              </p>
            </div>

            <a href={`tel:${listing.seller_phone.replace(/\D/g, '')}`} className="btn-primary mt-4 w-full">
              Call {listing.seller_phone}
            </a>

            <div className="mt-3 flex items-center justify-between">
              <CompareToggle id={listing.id} />
              <FavoriteButton listingId={listing.id} signedIn={Boolean(user)} />
            </div>
          </div>

          <div className="card p-5">
            <InquiryForm
              listingId={listing.id}
              title="Request more information"
              defaultMessage={`I'm interested in the ${listing.title}. Please send me more details and availability.`}
            />
          </div>

          <FinanceCalculator price={listing.price} />
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl">Similar vehicles</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}

      <CompareBar />
    </div>
  );
}
