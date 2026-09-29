import Link from 'next/link';
import type { Metadata } from 'next';
import ListingForm from '@/components/ListingForm';
import { currentUser } from '@/lib/auth';
import { LISTING_DAYS, planLabel } from '@/lib/plans';
import { quotaFor } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sell your vehicle',
  description: 'List your limousine, van, shuttle or motorcoach in front of operators actively shopping for equipment.',
};

function Gate({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="card max-w-2xl p-8">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 text-slate-400">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

export default async function SellPage() {
  const user = await currentUser();
  const isAdmin = user?.role === 'admin';
  const quota = user && !isAdmin ? await quotaFor(user.id) : null;

  let body: React.ReactNode;

  if (!user) {
    body = (
      <Gate title="Create an account to start selling" body="Listing takes two quick steps: create a free account, then pick a plan that fits how many vehicles you sell.">
        <Link href="/register?next=/subscriptions" className="btn-primary">Create account</Link>
        <Link href="/login?next=/sell" className="btn-ghost">I already have one</Link>
      </Gate>
    );
  } else if (quota?.reason === 'no-plan') {
    body = (
      <Gate title="Choose a plan to list your vehicle" body={`Plans start at $59/month for one active listing, and every listing runs for ${LISTING_DAYS} days.`}>
        <Link href="/subscriptions" className="btn-primary">See plans</Link>
      </Gate>
    );
  } else if (quota?.reason === 'full') {
    body = (
      <Gate
        title="All your listing slots are in use"
        body={`Your ${planLabel(quota.subscription!.plan)} plan allows ${quota.limit} active listing${quota.limit === 1 ? '' : 's'}. Upgrade for more, or free a slot by removing a listing or letting one expire.`}
      >
        <Link href="/subscriptions" className="btn-primary">Upgrade plan</Link>
        <Link href="/account" className="btn-ghost">Manage listings</Link>
      </Gate>
    );
  } else {
    body = (
      <>
        <p className="mb-6 max-w-3xl rounded-lg border border-ink-line bg-ink-soft px-4 py-3 text-sm text-slate-300">
          {isAdmin
            ? 'Listing as an administrator: house inventory needs no plan and does not expire.'
            : `This uses 1 of your ${quota!.limit} listing slots (${quota!.remaining} free) and stays live for ${LISTING_DAYS} days. You can renew it from your account.`}
        </p>
        <div className="max-w-3xl">
          <ListingForm sellerName={user.company ?? user.name} sellerPhone={user.phone ?? ''} />
        </div>
      </>
    );
  }

  return (
    <div className="wrap py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">List your vehicle</h1>
        <p className="mt-3 leading-relaxed text-slate-400">
          Put your equipment in front of operators who are actively shopping.
        </p>
      </header>
      {body}
    </div>
  );
}
