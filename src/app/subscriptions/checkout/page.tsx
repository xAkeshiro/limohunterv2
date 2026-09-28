import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { subscribeToPlan } from '@/lib/actions';
import { BILLING_DAYS, LISTING_DAYS, getPlan, listingsLabel, planLabel } from '@/lib/plans';
import { activeListingCount, currentSubscription } from '@/lib/subscriptions';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const planId = Array.isArray(sp.plan) ? sp.plan[0] : sp.plan;
  const plan = getPlan(planId);
  if (!plan) redirect('/subscriptions');

  const user = await currentUser();
  if (!user) redirect(`/register?next=${encodeURIComponent(`/subscriptions/checkout?plan=${plan.id}`)}`);

  const current = currentSubscription(user.id);
  if (current?.plan.id === plan.id) redirect('/account');

  const live = activeListingCount(user.id);
  const overLimit = live > plan.listings;

  return (
    <div className="wrap flex justify-center py-14">
      <div className="w-full max-w-lg">
        <Link href="/subscriptions" className="text-sm link-muted">← All plans</Link>
        <h1 className="mt-3 text-3xl">Confirm your plan</h1>

        <div className="card mt-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {plan.group === 'dealer' ? 'Dealer subscription' : 'Subscription'}
              </p>
              <h2 className="mt-1 text-xl">{plan.name}</h2>
            </div>
            <p className="text-right">
              <span className="text-3xl font-bold text-brand-300">${plan.price}</span>
              <span className="block text-xs text-slate-500">per month</span>
            </p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-ink-line pt-5 text-sm text-slate-300">
            <li>✓ {listingsLabel(plan.listings)} at a time</li>
            <li>✓ {LISTING_DAYS}-day listing period per vehicle</li>
            <li>✓ Renews every {BILLING_DAYS} days — cancel any time</li>
          </ul>

          {current && (
            <p className="mt-5 rounded-lg border border-ink-line bg-ink px-4 py-3 text-sm text-slate-300">
              This replaces your <strong className="text-white">{planLabel(current.plan)}</strong> plan
              straight away.
              {overLimit && (
                <>
                  {' '}You have {live} live listings and this plan allows {plan.listings}. They stay
                  live until they expire, but you won&apos;t be able to add more until you&apos;re
                  under the limit.
                </>
              )}
            </p>
          )}

          <form action={subscribeToPlan} className="mt-6">
            <input type="hidden" name="plan" value={plan.id} />
            <SubmitButton pendingText="Activating…" className="btn-primary w-full">
              {current ? 'Switch plan' : 'Start subscription'} — ${plan.price}/month
            </SubmitButton>
          </form>

          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
            <strong className="text-amber-200">Demo mode — no payment is taken.</strong> Your plan
            activates immediately so you can try listing. Card payments are switched on by
            connecting a payment provider.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
