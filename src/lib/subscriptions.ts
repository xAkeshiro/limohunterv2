import { getDb } from './db';
import { BILLING_DAYS, LISTING_DAYS, getPlan, type Plan } from './plans';
import { liveSql } from './types';

/**
 * Subscription rules, kept free of request/cookie handling so they can be
 * exercised directly.
 *
 * - One current subscription per user; choosing a new plan replaces it.
 * - A plan caps how many of the user's listings may be live at once.
 * - Each listing is live for LISTING_DAYS, then must be renewed.
 * - Cancelling keeps the plan until the end of the paid period.
 *
 * Payment is not wired up yet: an active plan renews itself each period.
 * That is the single place a payment provider would hook in (see renewDue).
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

function dbNow(): string {
  return (getDb().prepare("SELECT datetime('now') AS n").get() as { n: string }).n;
}

function addDays(timestamp: string, days: number): string {
  return (getDb().prepare(`SELECT datetime(?, '+${days} days') AS n`).get(timestamp) as { n: string }).n;
}

/**
 * Advances a lapsed period. An active plan rolls forward (demo billing: this
 * is where a failed charge would end it instead); a cancelled plan ends.
 */
function renewDue(row: SubscriptionRow): SubscriptionRow | null {
  const now = dbNow();
  if (row.current_period_end > now) return row;

  const db = getDb();
  if (row.status === 'cancelled') {
    db.prepare("UPDATE subscriptions SET status = 'ended', ended_at = current_period_end WHERE id = ?").run(row.id);
    return null;
  }

  let end = row.current_period_end;
  while (end <= now) end = addDays(end, BILLING_DAYS);
  db.prepare('UPDATE subscriptions SET current_period_end = ? WHERE id = ?').run(end, row.id);
  return { ...row, current_period_end: end };
}

export function currentSubscription(userId: number): CurrentSubscription | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'cancelled')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(userId) as SubscriptionRow | undefined;
  if (!row) return null;

  const plan = getPlan(row.plan_id);
  if (!plan) return null;

  const live = renewDue(row);
  return live ? { ...live, plan } : null;
}

/** Live, unsold listings are what occupy a slot; expired or sold ones free it. */
export function activeListingCount(userId: number): number {
  return (
    getDb()
      .prepare(`SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND sold = 0 AND ${liveSql()}`)
      .get(userId) as { n: number }
  ).n;
}

export function quotaFor(userId: number): Quota {
  const subscription = currentSubscription(userId);
  const used = activeListingCount(userId);
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
export function subscribe(userId: number, planId: string): CurrentSubscription {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `UPDATE subscriptions SET status = 'ended', ended_at = datetime('now')
       WHERE user_id = ? AND status IN ('active', 'cancelled')`,
    ).run(userId);
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
       VALUES (?, ?, 'active', datetime('now', '+${BILLING_DAYS} days'))`,
    ).run(userId, plan.id);
  })();

  const current = currentSubscription(userId);
  if (!current) throw new Error('Subscription was not created');
  return current;
}

/** Stops renewal; the plan keeps working until the paid period ends. */
export function cancelSubscription(userId: number): boolean {
  const result = getDb()
    .prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now')
       WHERE user_id = ? AND status = 'active'`,
    )
    .run(userId);
  return result.changes > 0;
}

export function resumeSubscription(userId: number): boolean {
  const result = getDb()
    .prepare(
      `UPDATE subscriptions SET status = 'active', cancelled_at = NULL
       WHERE user_id = ? AND status = 'cancelled' AND current_period_end > datetime('now')`,
    )
    .run(userId);
  return result.changes > 0;
}

/** SQL for a new listing's expiry, so every write uses the same period. */
export const LISTING_EXPIRY_SQL = `datetime('now', '+${LISTING_DAYS} days')`;

export type RenewResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'no-plan' | 'full' };

/**
 * Restarts a listing's period. Extending one that is already live needs no
 * free slot; bringing an expired one back does.
 */
export function renewListing(userId: number, listingId: number): RenewResult {
  const db = getDb();
  const listing = db
    .prepare(
      `SELECT id, sold, (${liveSql()}) AS live FROM listings WHERE id = ? AND seller_id = ?`,
    )
    .get(listingId, userId) as { id: number; sold: number; live: number } | undefined;
  if (!listing) return { ok: false, reason: 'not-found' };

  const quota = quotaFor(userId);
  if (!quota.subscription) return { ok: false, reason: 'no-plan' };
  if (!listing.live && quota.remaining === 0) return { ok: false, reason: 'full' };

  db.prepare(
    `UPDATE listings SET status = 'published', expires_at = ${LISTING_EXPIRY_SQL} WHERE id = ?`,
  ).run(listingId);
  return { ok: true };
}

/** Days left until a timestamp, rounded up; negative once it has passed. */
export function daysUntil(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const end = new Date(`${timestamp.replace(' ', 'T')}Z`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}
