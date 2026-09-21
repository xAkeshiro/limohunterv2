import Link from 'next/link';
import type { Metadata } from 'next';
import InquiryForm from '@/components/InquiryForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Fleet Marketplace about buying, selling or financing second-hand limousines and luxury transportation equipment.',
};

export default function ContactPage() {
  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Contact</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl sm:text-4xl">Contact us</h1>
          <p className="mt-4 leading-relaxed text-slate-400">
            Whether you are shopping for a specific vehicle, listing equipment for sale, or
            working out financing, we are happy to help.
          </p>

          <dl className="mt-8 space-y-5">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1">
                <a href="tel:+12533147568" className="text-lg font-semibold text-brand-300 hover:text-brand-200">
                  (253) 314-7568
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Hours</dt>
              <dd className="mt-1 text-slate-200">Monday – Friday, 9:00 AM – 5:00 PM</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Sell your vehicle</dt>
              <dd className="mt-1">
                <Link href="/sell" className="text-slate-200 hover:text-brand-200">
                  List equipment on Fleet Marketplace →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <InquiryForm kind="general" title="Send us a message" />
        </div>
      </div>
    </div>
  );
}
