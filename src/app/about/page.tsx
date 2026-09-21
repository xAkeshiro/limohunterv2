import Link from 'next/link';
import type { Metadata } from 'next';
import { stats } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About',
  description: 'Fleet Marketplace connects buyers and sellers of second-hand limousines and luxury transportation equipment across the United States.',
};

export default function AboutPage() {
  const totals = stats();

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">About</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">About Fleet Marketplace</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-400">
          We are a marketplace built specifically for second-hand limousines and luxury
          transportation equipment — the vehicles that general classified sites handle badly
          because they do not understand what they are looking at.
        </p>
      </header>

      <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { label: 'Vehicles listed', value: `${totals.listings}+` },
          { label: 'Makes represented', value: `${totals.makes}+` },
          { label: 'States covered', value: `${totals.states}+` },
          { label: 'Years in market', value: '20+' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-brand-300">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">What we do</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-slate-400">
            <p>
              Operators buy and sell equipment constantly — fleets rotate, contracts end,
              businesses grow and wind down. That equipment is specialised: a 200-inch SUV
              stretch, a 56-passenger coach and an executive sedan have almost nothing in
              common beyond carrying passengers.
            </p>
            <p>
              Fleet Marketplace lists all of it in one place, described in the terms the industry
              actually uses: body style, passenger capacity, interior build, service history
              and the equipment that comes with it.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl">Who we serve</h2>
          <ul className="mt-4 space-y-3">
            {[
              'Livery and charter operators adding or rotating fleet vehicles',
              'Coach builders and converters moving completed stock',
              'Dealers specialising in commercial passenger equipment',
              'Start-up operators buying their first vehicle',
              'Collectors and event companies sourcing antique and specialty cars',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-slate-300">
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#e6bf57" strokeWidth="2.5" className="mt-1 shrink-0" aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-14">
        <div className="card p-8 sm:p-10">
          <h2 className="text-2xl">Talk to us</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Questions about a listing, or about selling your own equipment? Reach us by phone
            Monday through Friday, 9:00 AM to 5:00 PM.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="tel:+12533147568" className="btn-primary">(253) 314-7568</a>
            <Link href="/contact" className="btn-ghost">Send a message</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
