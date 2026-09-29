import { getDb, type Db } from './db';
import { BILLING_DAYS, LISTING_DAYS, getPlan, type Plan } from './plans';
import { parseTimestamp } from './format';
import { liveSql } from './types';

/**
 * Subscription rules, kept free of request/cookie handling so they can be
 * exercised directly.
 *
 * - One current subscription per user (also enforced by a unique index);
 *   choosing a new plan replaces it.
 * - A plan caps how many of the user's listings may be live at once.
 * - Each listing is live for LISTING_DAYS, then must be renewed.
 * - Cancelling keeps the plan until the end of the paid period.
 *
 * Payment is not wired up yet: an active plan renews itself each period.
 * That is the single place a payment provider takes over (see settleLapsed).
 */

export type SubscriptionStatus = 'active' | 'cancelled' | 'ended';

export interface SubscriptionRow {
  id: number;
  user_id: number;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  current_period_end: string;
  cancelled_at: string | null;
  ended_at: string | null;
  stripe_subscription_id: string | null;
}

export interface CurrentSubscription extends SubscriptionRow {
  plan: Plan;
}

export interface Quota {
  subscription: CurrentSubscription | null;
  used: number;
  limit: number;
  remaining: number;
  canList: boolean;
  reason: 'no-plan' | 'full' | null;
}

const PERIOD_SECONDS = BILLING_DAYS * 86_400;

/**
 * Settles a subscription whose paid period has run out. A cancelled plan
 * ends. An active plan rolls forward to the first period end after now.
 *
 * STRIPE: once payments are live, stop rolling active plans forward here and
 * let the invoice.paid / customer.subscription.* webhooks move
 * current_period_end instead, so an unpaid plan lapses.
 */
async function settleLapsed(db: Db, row: SubscriptionRow): Promise<SubscriptionRow | null> {
  if (row.status === 'cancelled') {
    await db.run(
      "UPDATE subscriptions SET status = 'ended', ended_at = current_period_end WHERE id = ? AND status = 'cancelled'",
      [row.id],
    );
    return null;
  }
  const renewed = await db.get<SubscriptionRow>(
    `UPDATE subscriptions
     SET current_period_end = current_period_end + interval '${BILLING_DAYS} days'
         * (FLOOR(EXTRACT(EPOCH FROM (now() - current_period_end)) / ${PERIOD_SECONDS}) + 1)
     WHERE id = ? AND status = 'active' AND current_period_end <= now()
     RETURNING *`,
    [row.id],
  );
  return renewed ?? row;
}

export async function currentSubscription(userId: number): Promise<CurrentSubscription | null> {
  const db = await getDb();
  const row = await db.get<SubscriptionRow & { lapsed: boolean }>(
    `SELECT *, current_period_end <= now() AS lapsed FROM subscriptions
     WHERE user_id = ? AND status IN ('active', 'cancelled')
     ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  if (!row) return null;

  const plan = getPlan(row.plan_id);
  if (!plan) return null;

  const { lapsed, ...sub } = row;
  const live = lapsed ? await settleLapsed(db, sub) : sub;
  return live ? { ...live, plan } : null;
}

/** Live, unsold listings are what occupy a slot; expired or sold ones free it. */
export async function activeListingCount(userId: number): Promise<number> {
  const db = await getDb();
  const row = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND sold = 0 AND ${liveSql()}`,
    [userId],
  );
  return row?.n ?? 0;
}

export async function quotaFor(userId: number): Promise<Quota> {
  const [subscription, used] = await Promise.all([currentSubscription(userId), activeListingCount(userId)]);
  const limit = subscription?.plan.listings ?? 0;
  const remaining = Math.max(limit - used, 0);

  return {
    subscription,
    used,
    limit,
    remaining,
    canList: Boolean(subscription) && remaining > 0,
    reason: !subscription ? 'no-plan' : remaining === 0 ? 'full' : null,
  };
}

/** Starts a plan now, replacing whatever the user had. */
export async function subscribe(userId: number, planId: string): Promise<CurrentSubscription> {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.run(
      `UPDATE subscriptions SET status = 'ended', ended_at = now()
       WHERE user_id = ? AND status IN ('active', 'cancelled')`,
      [userId],
    );
    await tx.run(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
       VALUES (?, ?, 'active', now() + interval '${BILLING_DAYS} days')`,
      [userId, plan.id],
    );
  });

  const current = await currentSubscription(userId);
  if (!current) throw new Error('Subscription was not created');
  return current;
}

/** Stops renewal; the plan keeps working until the paid period ends. */
export async function cancelSubscription(userId: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.run(
    `UPDATE subscriptions SET status = 'cancelled', cancelled_at = now()
     WHERE user_id = ? AND status = 'active'`,
    [userId],
  );
  return result.rowCount > 0;
}

export async function resumeSubscription(userId: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.run(
    `UPDATE subscriptions SET status = 'active', cancelled_at = NULL
     WHERE user_id = ? AND status = 'cancelled' AND current_period_end > now()`,
    [userId],
  );
  return result.rowCount > 0;
}

/** SQL for a new listing's expiry, so every write uses the same period. */
export const LISTING_EXPIRY_SQL = `now() + interval '${LISTING_DAYS} days'`;

export type RenewResult = { ok: true } | { ok: false; reason: 'not-found' | 'no-plan' | 'full' };

/**
 * Restarts a listing's period. Extending one that is already live needs no
 * free slot; bringing an expired one back does.
 */
export async function renewListing(userId: number, listingId: number): Promise<RenewResult> {
  const db = await getDb();
  const listing = await db.get<{ id: number; live: boolean }>(
    `SELECT id, (${liveSql()}) AS live FROM listings WHERE id = ? AND seller_id = ?`,
    [listingId, userId],
  );
  if (!listing) return { ok: false, reason: 'not-found' };

  const quota = await quotaFor(userId);
  if (!quota.subscription) return { ok: false, reason: 'no-plan' };
  if (!listing.live && quota.remaining === 0) return { ok: false, reason: 'full' };

  await db.run(`UPDATE listings SET status = 'published', expires_at = ${LISTING_EXPIRY_SQL} WHERE id = ?`, [listingId]);
  return { ok: true };
}

/** Days left until a timestamp, rounded up; negative once it has passed. */
export function daysUntil(timestamp: string | null): number | null {
  if (!timestamp) return null;
  return Math.ceil((parseTimestamp(timestamp).getTime() - Date.now()) / 86_400_000);
}
