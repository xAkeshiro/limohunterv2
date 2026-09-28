import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { favoritesForUser, listingsForUser } from '@/lib/queries';
import { cancelPlan, deleteListing, logout, renewMyListing, resumePlan } from '@/lib/actions';
import { money, shortDate } from '@/lib/format';
import { getPlan, planLabel } from '@/lib/plans';
import { daysUntil, quotaFor } from '@/lib/subscriptions';
import { withPhotosAll } from '@/lib/photos';
import ListingCard from '@/components/ListingCard';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My account' };

const RENEW_ERROR: Record<string, string> = {
  'no-plan': 'Choose a plan to renew listings.',
  full: 'Every slot on your plan is in use. Remove a listing or upgrade to bring this one back.',
  'not-found': 'That listing could not be found.',
};

function ListingState({ status, sold, expiresAt }: { status: string; sold: number; expiresAt: string | null }) {
  const days = daysUntil(expiresAt);
  if (sold) return <span className="text-xs font-semibold text-slate-400">Sold</span>;
  if (status !== 'published') return <span className="text-xs font-semibold capitalize text-amber-300">{status}</span>;
  if (days === null) return <span className="text-xs font-semibold text-emerald-300">Live</span>;
  if (days <= 0) return <span className="text-xs font-semibold text-red-400">Expired {shortDate(expiresAt!)}</span>;
  return (
    <span className={`text-xs font-semibold ${days <= 5 ? 'text-amber-300' : 'text-emerald-300'}`}>
      Live · {days} day{days === 1 ? '' : 's'} left
    </span>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const subscribed = getPlan(one(sp.subscribed));
  const renewError = RENEW_ERROR[one(sp.renew) ?? ''];

  const isAdmin = user.role === 'admin';
  const quota = quotaFor(user.id);
  const sub = quota.subscription;
  const listings = listingsForUser(user.id);
  const saved = await withPhotosAll(favoritesForUser(user.id));
  const pct = quota.limit ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  return (
    <div className="wrap py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">My account</h1>
          <p className="mt-2 text-slate-400">
            {user.name} · <span className="text-slate-300">{user.email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sell" className="btn-primary">List a vehicle</Link>
          <form action={logout}>
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      {subscribed && (
        <p role="status" className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          You&apos;re subscribed to {planLabel(subscribed)}. You can list up to {subscribed.listings}{' '}
          vehicle{subscribed.listings === 1 ? '' : 's'} at a time.{' '}
          <Link href="/sell" className="font-semibold underline">List one now →</Link>
        </p>
      )}
      {renewError && (
        <p role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {renewError}
        </p>
      )}

      {/* Plan */}
      <section className="card p-6" aria-labelledby="plan-heading">
        {isAdmin ? (
          <>
            <h2 id="plan-heading" className="text-xl">Administrator</h2>
            <p className="mt-2 text-sm text-slate-400">
              Admin accounts list house inventory without a plan, and those listings don&apos;t expire.
            </p>
          </>
        ) : sub ? (
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Your plan</p>
              <h2 id="plan-heading" className="mt-1 text-2xl">
                {planLabel(sub.plan)}{' '}
                <span className="text-base font-normal text-slate-400">· ${sub.plan.price}/month</span>
              </h2>

              <div className="mt-5 max-w-md">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-300">Active listings</span>
                  <span className="font-semibold text-white">
                    {quota.used} of {quota.limit}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink" role="progressbar"
                     aria-valuenow={quota.used} aria-valuemin={0} aria-valuemax={quota.limit}
                     aria-label="Active listings used">
                  <div
                    className={`h-full rounded-full ${quota.remaining === 0 ? 'bg-amber-400' : 'bg-brand-300'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {quota.remaining > 0
                    ? `${quota.remaining} slot${quota.remaining === 1 ? '' : 's'} free.`
                    : 'All slots in use — remove a listing, let one expire, or upgrade to add more.'}
                </p>
              </div>

              <p className="mt-5 text-sm text-slate-400">
                {sub.status === 'cancelled' ? (
                  <>Cancelled — your plan stays active until <strong className="text-white">{shortDate(sub.current_period_end)}</strong>, then ends.</>
                ) : (
                  <>Renews on <strong className="text-white">{shortDate(sub.current_period_end)}</strong>.</>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <Link href="/subscriptions" className="btn-ghost">Change plan</Link>
              {sub.status === 'cancelled' ? (
                <form action={resumePlan}>
                  <SubmitButton pendingText="Resuming…" className="btn-primary">Resume plan</SubmitButton>
                </form>
              ) : (
                <form action={cancelPlan}>
                  <SubmitButton pendingText="Cancelling…" className="text-sm font-medium text-slate-400 hover:text-red-300">
                    Cancel plan
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="plan-heading" className="text-xl">No plan yet</h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose a subscription to start listing vehicles. Plans start at $59/month.
              </p>
            </div>
            <Link href="/subscriptions" className="btn-primary">See plans</Link>
          </div>
        )}
      </section>

      {/* Listings */}
      <section className="mt-12">
        <h2 className="text-xl">My listings ({listings.length})</h2>

        {listings.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="text-sm text-slate-400">You have not listed a vehicle yet.</p>
            <Link href="/sell" className="btn-primary mt-4">List your first vehicle</Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-3 pr-4">Vehicle</th>
                  <th scope="col" className="py-3 pr-4">Price</th>
                  <th scope="col" className="py-3 pr-4">Status</th>
                  <th scope="col" className="py-3 pr-4">Views</th>
                  <th scope="col" className="py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const days = daysUntil(l.expires_at);
                  const renewable = !isAdmin && days !== null && !l.sold;
                  return (
                    <tr key={l.id} className="border-b border-ink-line/60">
                      <td className="py-3 pr-4">
                        <Link href={`/listing/${l.slug}`} className="font-medium text-slate-100 hover:text-brand-200">
                          {l.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{money(l.price)}</td>
                      <td className="py-3 pr-4"><ListingState status={l.status} sold={l.sold} expiresAt={l.expires_at} /></td>
                      <td className="py-3 pr-4 text-slate-300">{l.views}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-3">
                          {renewable && (
                            <form action={renewMyListing}>
                              <input type="hidden" name="id" value={l.id} />
                              <SubmitButton pendingText="Renewing…" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                                {days! <= 0 ? 'Renew' : 'Extend 30 days'}
                              </SubmitButton>
                            </form>
                          )}
                          <form action={deleteListing}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="text-xs font-medium text-red-400 hover:text-red-300">
                              Remove
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl">Saved vehicles ({saved.length})</h2>
        {saved.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="text-sm text-slate-400">Vehicles you save from a listing page appear here.</p>
            <Link href="/inventory" className="btn-ghost mt-4">Browse inventory</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
