import Link from 'next/link';

interface Props {
  page: number;
  pages: number;
  /** Current query string without the page param. */
  baseQuery: string;
}

export default function Pagination({ page, pages, baseQuery }: Props) {
  if (pages <= 1) return null;

  const href = (n: number) => `/inventory?${baseQuery ? `${baseQuery}&` : ''}page=${n}`;

  // Show a compact window around the current page rather than every number.
  const windowed = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-ghost px-3">
          Previous
        </Link>
      )}

      {windowed.map((n, i) => {
        const gap = i > 0 && n - windowed[i - 1] > 1;
        return (
          <span key={n} className="flex items-center gap-1.5">
            {gap && <span className="px-1 text-slate-600">…</span>}
            <Link
              href={href(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold ${
                n === page
                  ? 'bg-brand-300 text-ink'
                  : 'border border-ink-line text-slate-300 hover:border-brand-300 hover:text-brand-200'
              }`}
            >
              {n}
            </Link>
          </span>
        );
      })}

      {page < pages && (
        <Link href={href(page + 1)} className="btn-ghost px-3">
          Next
        </Link>
      )}
    </nav>
  );
}
