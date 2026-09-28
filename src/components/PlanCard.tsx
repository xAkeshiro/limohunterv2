import Link from 'next/link';
import { LISTING_DAYS, listingsLabel, type Plan } from '@/lib/plans';

const BAND: Record<Plan['tier'], string> = {
  bronze: 'bg-gradient-to-br from-[#d39a5e] to-[#9a6130]',
  silver: 'bg-gradient-to-br from-[#d7dbe2] to-[#8f959f]',
  gold: 'bg-gradient-to-br from-[#f0d27a] to-[#c9901c]',
};

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e6bf57" strokeWidth="2.6" className="mt-0.5 shrink-0" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  const gold = plan.tier === 'gold';

  return (
    <article
      className={`card relative flex flex-col overflow-hidden ${current ? 'border-brand-300 ring-1 ring-brand-300' : ''}`}
    >
      {plan.popular && (
        // Diagonal ribbon in the top-left corner, clipped by the card.
        <span className="absolute -left-9 top-5 z-10 w-36 -rotate-45 bg-emerald-400 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-ink shadow">
          Popular
        </span>
      )}

      <header className={`${BAND[plan.tier]} px-5 py-6 text-center text-ink`}>
        <h3 className="text-xl font-bold !text-ink">
          {gold && <span aria-hidden="true">☆ </span>}
          {plan.name}
          {gold && <span aria-hidden="true"> ☆</span>}
        </h3>
        <p className="mt-1 text-sm font-medium opacity-80">
          {plan.listings} listing{plan.listings === 1 ? '' : 's'}
        </p>
      </header>

      <div className="flex flex-1 flex-col px-6 py-6">
        <p className="text-center">
          <span className="align-top text-lg font-semibold text-slate-300">$</span>
          <span className="text-5xl font-bold text-white">{plan.price}</span>
          <span className="mt-1 block text-sm text-slate-400">/ month</span>
        </p>

        {current ? (
          <Link href="/account" className="btn-ghost mt-6 w-full border-brand-300 text-brand-200">
            Your current plan
          </Link>
        ) : (
          <Link href={`/subscriptions/checkout?plan=${plan.id}`} className="btn-primary mt-6 w-full uppercase tracking-wide">
            Sign up
          </Link>
        )}

        <ul className="mt-6 space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-2.5"><Check />{listingsLabel(plan.listings)}</li>
          <li className="flex items-start gap-2.5"><Check />{LISTING_DAYS}-day listing period</li>
        </ul>
      </div>
    </article>
  );
}
