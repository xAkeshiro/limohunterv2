'use client';

import { useCompare } from './CompareBar';

export default function CompareToggle({ id, className = '' }: { id: number; className?: string }) {
  const { ids, toggle, max } = useCompare();
  const selected = ids.includes(id);
  const full = !selected && ids.length >= max;

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      disabled={full}
      title={full ? `You can compare up to ${max} vehicles` : undefined}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
        selected ? 'text-brand-300' : 'text-slate-400 hover:text-brand-200'
      } ${full ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      aria-pressed={selected}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        {selected ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
      {selected ? 'Added to compare' : 'Compare'}
    </button>
  );
}
