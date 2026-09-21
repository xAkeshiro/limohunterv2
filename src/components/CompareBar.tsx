'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

const KEY = 'lh_compare';
const EVENT = 'lh_compare_changed';
const MAX = 4;

export function readCompare(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function writeCompare(ids: number[]) {
  window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  window.dispatchEvent(new Event(EVENT));
}

/** Shared compare state; every subscriber re-reads on the custom event. */
export function useCompare() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompare());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: number) => {
    const current = readCompare();
    writeCompare(
      current.includes(id) ? current.filter((n) => n !== id) : [...current, id].slice(0, MAX),
    );
  }, []);

  const clear = useCallback(() => writeCompare([]), []);

  return { ids, toggle, clear, max: MAX };
}

export default function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink-soft/95 backdrop-blur">
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{ids.length}</span> vehicle
          {ids.length === 1 ? '' : 's'} selected to compare
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={clear} className="btn-ghost">
            Clear
          </button>
          <Link href={`/compare?ids=${ids.join(',')}`} className="btn-primary">
            Compare now
          </Link>
        </div>
      </div>
    </div>
  );
}
