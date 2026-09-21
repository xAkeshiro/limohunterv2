'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Facet {
  value: string;
  count: number;
}

interface Props {
  facets: {
    bodyStyles: Facet[];
    makes: Facet[];
    states: Facet[];
    conditions: Facet[];
    bounds: { minPrice: number; maxPrice: number; minYear: number; maxYear: number };
  };
}

export default function FilterSidebar({ facets }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const selected = (key: string) => params.getAll(key);

  /** Every change rebuilds the query string and resets to page 1. */
  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete('page');
    router.push(`/inventory?${next.toString()}`);
  };

  const toggleValue = (key: string, value: string) =>
    update((next) => {
      const existing = next.getAll(key);
      next.delete(key);
      const remaining = existing.includes(value)
        ? existing.filter((v) => v !== value)
        : [...existing, value];
      remaining.forEach((v) => next.append(key, v));
    });

  const setValue = (key: string, value: string) =>
    update((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

  const activeCount =
    ['body_style', 'make', 'state', 'condition'].reduce((n, k) => n + selected(k).length, 0) +
    ['min_price', 'max_price', 'min_year', 'max_year', 'max_mileage', 'min_passengers'].filter((k) =>
      params.get(k),
    ).length;

  const group = (title: string, key: string, items: Facet[]) => (
    <fieldset className="border-t border-ink-line px-4 py-4">
      <legend className="sr-only">{title}</legend>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <label key={item.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={selected(key).includes(item.value)}
              onChange={() => toggleValue(key, item.value)}
              className="h-4 w-4 shrink-0 rounded border-ink-line bg-ink accent-brand-300"
            />
            <span className="flex-1 text-slate-300">{item.value}</span>
            <span className="text-xs text-slate-500">{item.count}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost mb-4 w-full lg:hidden"
        aria-expanded={open}
      >
        {open ? 'Hide filters' : `Filters${activeCount ? ` (${activeCount})` : ''}`}
      </button>

      <aside className={`card overflow-hidden ${open ? 'block' : 'hidden'} lg:block`}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="text-sm font-semibold text-white">Refine results</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.push('/inventory')}
              className="text-xs font-medium text-brand-300 hover:text-brand-200"
            >
              Reset
            </button>
          )}
        </div>

        {group('Vehicle type', 'body_style', facets.bodyStyles)}
        {group('Make', 'make', facets.makes)}

        <fieldset className="border-t border-ink-line px-4 py-4">
          <legend className="sr-only">Price</legend>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Price (USD)</h3>
          <div className="flex items-center gap-2">
            <input
              type="number" inputMode="numeric" placeholder="Min" className="field"
              defaultValue={params.get('min_price') ?? ''}
              onBlur={(e) => setValue('min_price', e.target.value)}
              aria-label="Minimum price"
            />
            <span className="text-slate-600">–</span>
            <input
              type="number" inputMode="numeric" placeholder="Max" className="field"
              defaultValue={params.get('max_price') ?? ''}
              onBlur={(e) => setValue('max_price', e.target.value)}
              aria-label="Maximum price"
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-ink-line px-4 py-4">
          <legend className="sr-only">Year</legend>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Year</h3>
          <div className="flex items-center gap-2">
            <input
              type="number" inputMode="numeric" placeholder={String(facets.bounds.minYear)} className="field"
              defaultValue={params.get('min_year') ?? ''}
              onBlur={(e) => setValue('min_year', e.target.value)}
              aria-label="Earliest year"
            />
            <span className="text-slate-600">–</span>
            <input
              type="number" inputMode="numeric" placeholder={String(facets.bounds.maxYear)} className="field"
              defaultValue={params.get('max_year') ?? ''}
              onBlur={(e) => setValue('max_year', e.target.value)}
              aria-label="Latest year"
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-ink-line px-4 py-4">
          <legend className="sr-only">Mileage and capacity</legend>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Mileage & capacity
          </h3>
          <label className="label" htmlFor="max_mileage">Max mileage</label>
          <input
            id="max_mileage" type="number" inputMode="numeric" placeholder="Any" className="field"
            defaultValue={params.get('max_mileage') ?? ''}
            onBlur={(e) => setValue('max_mileage', e.target.value)}
          />
          <label className="label mt-3" htmlFor="min_passengers">Min passengers</label>
          <input
            id="min_passengers" type="number" inputMode="numeric" placeholder="Any" className="field"
            defaultValue={params.get('min_passengers') ?? ''}
            onBlur={(e) => setValue('min_passengers', e.target.value)}
          />
        </fieldset>

        {group('Condition', 'condition', facets.conditions)}
        {group('State', 'state', facets.states)}
      </aside>
    </>
  );
}
