'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BODY_STYLES } from '@/lib/types';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'views_desc', label: 'Most viewed' },
  { value: 'title', label: 'Title A–Z' },
];

export default function AdminListingFilters({ statuses }: { statuses: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.push(`/admin/listings?${next.toString()}`);
  };

  return (
    <form
      className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const input = new FormData(e.currentTarget).get('q');
        set('q', String(input ?? ''));
      }}
      role="search"
    >
      <div className="lg:col-span-2">
        <label className="sr-only" htmlFor="admin-q">Search listings</label>
        <input
          id="admin-q" name="q" className="field"
          placeholder="Search title, make, model or seller"
          defaultValue={params.get('q') ?? ''}
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="admin-status">Status</label>
        <select
          id="admin-status" className="field"
          value={params.get('status') ?? 'all'}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor="admin-type">Vehicle type</label>
        <select
          id="admin-type" className="field"
          value={params.get('body_style') ?? 'all'}
          onChange={(e) => set('body_style', e.target.value)}
        >
          <option value="all">All vehicle types</option>
          {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <label className="sr-only" htmlFor="admin-sort">Sort</label>
        <select
          id="admin-sort" className="field"
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => set('sort', e.target.value)}
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <button type="submit" className="btn-primary">Search</button>
    </form>
  );
}
