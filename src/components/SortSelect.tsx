'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'newest', label: 'Newest listings' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'year_desc', label: 'Year: newest first' },
  { value: 'year_asc', label: 'Year: oldest first' },
  { value: 'mileage_asc', label: 'Mileage: lowest first' },
];

export default function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  const change = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    next.delete('page');
    router.push(`/inventory?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-slate-400">Sort</label>
      <select
        id="sort"
        className="field w-auto py-2"
        value={params.get('sort') ?? 'newest'}
        onChange={(e) => change(e.target.value)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
