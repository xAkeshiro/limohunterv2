import Link from 'next/link';
import type { Metadata } from 'next';
import PlanCard from '@/components/PlanCard';
import { GROUP_LABEL, LISTING_DAYS, PLANS, type PlanGroup } from '@/lib/plans';
import { currentUser } from '@/lib/auth';
import { currentSubscription } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Subscriptions',
  description:
    'List your limousine, van, shuttle or coach. Monthly plans for private sellers and dealers, from 1 to 30 active listings.',
};

const INTRO: Record<PlanGroup, string> = {
  individual: 'For owners and operators selling a few vehicles.',
  dealer: 'For dealers and coach builders moving stock every month.',
};

export default async function SubscriptionsPage() {
  const user = await currentUser();
  const current = user ? await currentSubscription(user.id) : null;

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="link-muted">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Subscriptions</span>
      </nav>

      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl sm:text-4xl">Choose a plan and start listing</h1>
        <p className="mt-3 text-slate-400">
          Every plan includes a {LISTING_DAYS}-day listing period per vehicle. Change or cancel
          any time from your account.
        </p>
        {current && (
          <p className="mt-4 text-sm text-slate-300">
            You&apos;re on <span className="font-semibold text-brand-300">{current.plan.group === 'dealer' ? 'Dealer ' : ''}{current.plan.name}</span>.
            Choosing another plan switches you immediately.
          </p>
        )}
      </header>

      {(['individual', 'dealer'] as PlanGroup[]).map((group) => (
        <section key={group} className="mt-14" aria-labelledby={`plans-${group}`}>
          <div className="text-center">
            <h2 id={`plans-${group}`} className="text-2xl uppercase tracking-wide sm:text-3xl">
              {GROUP_LABEL[group]}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{INTRO[group]}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-3">
            {PLANS.filter((p) => p.group === group).map((plan) => (
              <PlanCard key={plan.id} plan={plan} current={current?.plan.id === plan.id} />
            ))}
          </div>
        </section>
      ))}

      <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-slate-500">
        An active listing counts toward your plan while it is live. Sold, removed and expired
        listings free up their slot, and expired listings can be renewed from your account.
      </p>
    </div>
  );
}
