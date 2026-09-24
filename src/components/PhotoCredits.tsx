import type { ImageCredit } from '@/lib/types';

/**
 * Attribution for freely licensed photos. Most Commons licenses require the
 * author and license to be shown, so this renders whenever credits exist.
 */
export default function PhotoCredits({
  credits,
  representative,
  vehicle,
}: {
  credits: ImageCredit[];
  representative: boolean;
  vehicle: string;
}) {
  if (credits.length === 0) return null;

  return (
    <div className="mt-3 text-xs leading-relaxed text-slate-500">
      {representative && (
        <p className="mb-1 text-slate-400">
          Representative photos of a {vehicle}, not of the vehicle for sale.
        </p>
      )}
      <p>
        Photos:{' '}
        {credits.map((c, i) => (
          <span key={c.src}>
            {i > 0 && ' · '}
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-200">
              {c.author}
            </a>
            {', '}
            {c.licenseUrl ? (
              <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:text-brand-200">
                {c.license}
              </a>
            ) : (
              c.license
            )}
          </span>
        ))}
        , via Wikimedia Commons.
      </p>
    </div>
  );
}
