import Link from 'next/link';
import type { Metadata } from 'next';
import ListingForm from '@/components/ListingForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sell your vehicle',
  description: 'List your limousine, van, shuttle or motorcoach in front of operators actively shopping for equipment.',
};

export default async function SellPage() {
  const user = await currentUser();

  return (
    <div className="wrap py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">List your vehicle</h1>
        <p className="mt-3 leading-relaxed text-slate-400">
          Put your equipment in front of operators who are actively shopping. Listings publish
          immediately and stay live until you remove them.
        </p>
        {!user && (
          <p className="mt-4 rounded-lg border border-ink-line bg-ink-soft px-4 py-3 text-sm text-slate-300">
            You can publish without an account, but{' '}
            <Link href="/register" className="font-semibold text-brand-300 hover:text-brand-200">
              creating one
            </Link>{' '}
            lets you edit and remove your listings later.
          </p>
        )}
      </header>

      <div className="max-w-3xl">
        <ListingForm sellerName={user?.company ?? user?.name ?? ''} sellerPhone={user?.phone ?? ''} />
      </div>
    </div>
  );
}
