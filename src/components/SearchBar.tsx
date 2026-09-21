'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BODY_STYLES } from '@/lib/types';

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [bodyStyle, setBodyStyle] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (bodyStyle) params.append('body_style', bodyStyle);
    if (maxPrice) params.set('max_price', maxPrice);
    router.push(`/inventory${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form
      onSubmit={submit}
      className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]"
      role="search"
    >
      <div>
        <label className="sr-only" htmlFor="hero-q">Keyword</label>
        <input
          id="hero-q" className="field" placeholder="Search make, model or keyword"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="hero-type">Vehicle type</label>
        <select id="hero-type" className="field" value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)}>
          <option value="">All vehicle types</option>
          {BODY_STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor="hero-price">Maximum price</label>
        <select id="hero-price" className="field" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
          <option value="">Any price</option>
          {[30000, 50000, 75000, 100000, 150000, 250000, 400000].map((p) => (
            <option key={p} value={p}>Up to ${p.toLocaleString()}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primary lg:px-6">Search inventory</button>
    </form>
  );
}
