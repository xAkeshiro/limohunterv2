'use client';

import { useState, useTransition } from 'react';
import { adminSearchPhotos } from '@/lib/admin-actions';
import type { Photo } from '@/lib/photos';

interface Props {
  defaultQuery: string;
  selected: string[];
  onAdd: (photos: Photo[]) => void;
}

/** Searches Wikimedia Commons from the editor and adds picks to the listing. */
export default function PhotoFinder({ defaultQuery, selected, onAdd }: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<Photo[] | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (q: string) => {
    if (!q.trim()) return;
    startTransition(async () => {
      setResults(await adminSearchPhotos(q));
    });
  };

  /** Picks up the make and model currently typed into the form. */
  const fromForm = () => {
    const read = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
    const q = `${read('make')} ${read('model')}`.trim();
    if (q) {
      setQuery(q);
      run(q);
    }
  };

  const fresh = (results ?? []).filter((p) => !selected.includes(p.src));

  return (
    <div className="rounded-lg border border-ink-line bg-ink p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Find photos online</h3>
        <span className="text-xs text-slate-500">Freely licensed, from Wikimedia Commons</span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="photo-query">Photo search</label>
        <input
          id="photo-query"
          className="field"
          value={query}
          placeholder="e.g. Cadillac Escalade limousine"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter would otherwise submit the whole listing form.
            if (e.key === 'Enter') {
              e.preventDefault();
              run(query);
            }
          }}
        />
        <button type="button" className="btn-primary shrink-0" disabled={pending} onClick={() => run(query)}>
          {pending ? 'Searching…' : 'Search'}
        </button>
        <button type="button" className="btn-ghost shrink-0" disabled={pending} onClick={fromForm}>
          Use make &amp; model
        </button>
      </div>

      {results !== null && !pending && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">
              No suitable photos found. Try a shorter search — just the make and model usually
              works best.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {results.length} photo{results.length === 1 ? '' : 's'} found. Pick any, then save
                  the listing.
                </p>
                {fresh.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-300 hover:text-brand-200"
                    onClick={() => onAdd(fresh.slice(0, 4))}
                  >
                    Add first {Math.min(4, fresh.length)}
                  </button>
                )}
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {results.map((photo) => {
                  const added = selected.includes(photo.src);
                  return (
                    <li key={photo.src} className="overflow-hidden rounded-lg border border-ink-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.src} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
                      <div className="p-2">
                        <p className="truncate text-[11px] text-slate-400" title={`${photo.author} · ${photo.license}`}>
                          {photo.author} · {photo.license}
                        </p>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => onAdd([photo])}
                          className={`mt-1.5 w-full rounded-md px-2 py-1 text-xs font-semibold ${
                            added
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-brand-300 text-ink hover:bg-brand-200'
                          }`}
                        >
                          {added ? 'Added' : 'Add to listing'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
