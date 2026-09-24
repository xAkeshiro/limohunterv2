import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import CompareBar from '@/components/CompareBar';
import { countByBodyStyle, getFeatured, getRecent, stats } from '@/lib/queries';
import { classPhoto, withPhotosAll } from '@/lib/photos';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    title: 'Search the national inventory',
    body: 'Filter thousands of second-hand limousines, stretches, vans and coaches by type, price, mileage, capacity and location.',
  },
  {
    title: 'Compare before you commit',
    body: 'Line up to four vehicles side by side on price, mileage, capacity and equipment so the trade-offs are obvious.',
  },
  {
    title: 'Finance, insure and drive away',
    body: 'Work with lenders and insurers who understand livery equipment, then coordinate inspection and transport.',
  },
];

export default async function HomePage() {
  const [featured, recent] = await Promise.all([
    withPhotosAll(getFeatured(6)),
    withPhotosAll(getRecent(8)),
  ]);
  const categories = await Promise.all(
    countByBodyStyle().map(async (cat) => ({ ...cat, photo: await classPhoto(cat.value) })),
  );
  const totals = stats();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(230,191,87,0.12),transparent_70%)]"
        />
        <div className="wrap relative py-16 sm:py-24">
          <p className="chip">Largest second hand inventory in US</p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Buy and sell used limousines with people who know the equipment.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Stretch limousines, SUV stretches, sprinter vans, shuttle buses, motorcoaches and
            executive sedans — listed by operators and coach builders across the country.
          </p>

          <div className="mt-8 max-w-4xl">
            <SearchBar />
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'Vehicles listed', value: totals.listings },
              { label: 'Makes represented', value: totals.makes },
              { label: 'States covered', value: totals.states },
              { label: 'Years in market', value: 20 },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{s.label}</dt>
                <dd className="mt-1 text-2xl font-bold text-white">{s.value}+</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Categories */}
      <section className="wrap py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl">Browse by vehicle type</h2>
            <p className="mt-2 text-slate-400">Every category of livery equipment in one marketplace.</p>
          </div>
          <Link href="/inventory" className="btn-ghost hidden sm:inline-flex">
            View all inventory
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              href={`/inventory?body_style=${encodeURIComponent(cat.value)}`}
              className="card group overflow-hidden transition-colors hover:border-brand-300/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.photo ?? `/img/${cat.value.toLowerCase().replace(/\s+/g, '-')}-1.svg`}
                alt=""
                loading="lazy"
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white group-hover:text-brand-200">
                  {cat.value}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cat.count} available
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="border-y border-ink-line bg-ink-soft/40 py-14">
          <div className="wrap">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl">Featured vehicles</h2>
                <p className="mt-2 text-slate-400">Hand-picked listings from our current inventory.</p>
              </div>
              <Link href="/inventory?sort=newest" className="btn-ghost hidden sm:inline-flex">
                See more
              </Link>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="wrap py-14">
        <h2 className="text-2xl sm:text-3xl">How Fleet Marketplace works</h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-300 text-sm font-bold text-ink">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="wrap pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">Recently listed</h2>
          <Link href="/inventory" className="btn-ghost hidden sm:inline-flex">
            View all
          </Link>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Sell CTA */}
      <section className="wrap pb-20">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,rgba(230,191,87,0.14),transparent_70%)]"
          />
          <div className="relative max-w-2xl">
            <h2 className="text-2xl sm:text-3xl">Have a vehicle to sell?</h2>
            <p className="mt-3 text-slate-400">
              List your limousine, van or coach in front of operators actively shopping for
              equipment. Create a free account, add your specs and photos, and start taking
              inquiries the same day.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/sell" className="btn-primary">List a vehicle</Link>
              <Link href="/finance" className="btn-ghost">Finance &amp; insurance</Link>
            </div>
          </div>
        </div>
      </section>

      <CompareBar />
    </>
  );
}
