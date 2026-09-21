import Link from 'next/link';
import type { Metadata } from 'next';
import InquiryForm from '@/components/InquiryForm';

export const metadata: Metadata = {
  title: 'Finance & insurance',
  description: 'Financing and insurance for limousines, shuttles and motorcoaches — built around livery equipment, not ordinary passenger cars.',
};

const FINANCE_POINTS = [
  {
    title: 'Lenders who understand livery',
    body: 'Commercial passenger vehicles are underwritten differently from ordinary cars. We work with lenders who already know stretch conversions, coach builds and high-mileage diesel equipment.',
  },
  {
    title: 'Terms that match the asset',
    body: 'Typical structures run 36 to 84 months depending on vehicle age, mileage and condition. Older and restored vehicles can usually still be financed, often with a larger down payment.',
  },
  {
    title: 'Fleet and single-unit options',
    body: 'Whether you are adding one sedan or refinancing a whole fleet, financing can be arranged per unit or as a single facility across multiple vehicles.',
  },
];

const INSURANCE_POINTS = [
  {
    title: 'Commercial auto liability',
    body: 'Meets the limits required by most state and municipal livery authorities, with filings handled where your jurisdiction requires them.',
  },
  {
    title: 'Physical damage & equipment',
    body: 'Covers the vehicle plus the interior build — bars, lighting, audio and entertainment equipment that a standard policy often leaves out.',
  },
  {
    title: 'Garage & non-owned coverage',
    body: 'Protection while vehicles sit on your lot between charters, and for the vehicles you bring in on subcontract.',
  },
];

const FAQS = [
  {
    q: 'Can I finance a vehicle over ten years old?',
    a: 'Often yes. Age limits vary by lender and by vehicle class — a well-documented motorcoach is treated very differently from a high-mileage sedan. Expect a larger down payment and a shorter term on older equipment.',
  },
  {
    q: 'Do I need to be an established operator?',
    a: 'Not necessarily. Start-up operators can qualify, though lenders typically look for industry experience, a business plan and a meaningful down payment.',
  },
  {
    q: 'How long does approval take?',
    a: 'Straightforward applications commonly come back within one to three business days. Larger fleet facilities take longer because more documentation is reviewed.',
  },
  {
    q: 'Can you insure a vehicle before it is delivered?',
    a: 'Yes. Coverage is usually bound effective the date of delivery so the vehicle is protected in transit and the moment it arrives.',
  },
];

export default function FinancePage() {
  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Finance &amp; insurance</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Finance &amp; insurance</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-400">
          Buying commercial passenger equipment is not like buying a car. We connect buyers
          with lenders and insurers who work in this industry every day and price the asset
          for what it actually is.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-2xl">Financing</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {FINANCE_POINTS.map((p) => (
            <div key={p.title} className="card p-6">
              <h3 className="text-lg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Insurance</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {INSURANCE_POINTS.map((p) => (
            <div key={p.title} className="card p-6">
              <h3 className="text-lg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="text-2xl">Common questions</h2>
          <dl className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="card p-5">
                <dt className="font-semibold text-white">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Information on this page is general and for illustration only. It is not a
            commitment to lend or a binder of insurance. All financing is subject to credit
            approval and all coverage is subject to the terms of the issued policy.
          </p>
        </section>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <InquiryForm kind="finance" title="Request a finance quote" />
        </aside>
      </div>
    </div>
  );
}
