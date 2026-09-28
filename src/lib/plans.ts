/**
 * Subscription catalogue. Two audiences, three tiers each, matching the
 * original LimoHunter pricing: private sellers and dealers.
 */

export type PlanGroup = 'individual' | 'dealer';
export type PlanTier = 'bronze' | 'silver' | 'gold';

export interface Plan {
  id: string;
  group: PlanGroup;
  tier: PlanTier;
  name: string;
  /** How many listings may be live at the same time. */
  listings: number;
  /** Monthly price in whole US dollars. */
  price: number;
  popular?: boolean;
}

/** How long each listing stays live before it must be renewed. */
export const LISTING_DAYS = 30;

/** Length of one billing period. */
export const BILLING_DAYS = 30;

export const PLANS: Plan[] = [
  { id: 'individual-bronze', group: 'individual', tier: 'bronze', name: 'Bronze Club', listings: 1, price: 59 },
  { id: 'individual-silver', group: 'individual', tier: 'silver', name: 'Silver Club', listings: 2, price: 109 },
  { id: 'individual-gold', group: 'individual', tier: 'gold', name: 'Gold Club', listings: 3, price: 149 },
  { id: 'dealer-bronze', group: 'dealer', tier: 'bronze', name: 'Bronze Club', listings: 5, price: 199 },
  { id: 'dealer-silver', group: 'dealer', tier: 'silver', name: 'Silver Club', listings: 10, price: 349, popular: true },
  { id: 'dealer-gold', group: 'dealer', tier: 'gold', name: 'Gold Club', listings: 30, price: 899 },
];

export const GROUP_LABEL: Record<PlanGroup, string> = {
  individual: 'Subscriptions',
  dealer: 'Dealer subscriptions',
};

export function getPlan(id: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

/** "Dealer Silver Club" / "Silver Club" — the group matters once plans are compared. */
export function planLabel(plan: Plan): string {
  return plan.group === 'dealer' ? `Dealer ${plan.name}` : plan.name;
}

export function listingsLabel(n: number): string {
  return `${n} active listing${n === 1 ? '' : 's'}`;
}
