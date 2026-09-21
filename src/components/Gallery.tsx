'use client';

import { useState } from 'react';

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const shots = images.length > 0 ? images : ['/img/placeholder.svg'];
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shots[active]}
          alt={`${alt} — view ${active + 1} of ${shots.length}`}
          className="aspect-[16/10] w-full object-cover"
        />
      </div>

      {shots.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {shots.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show view ${i + 1}`}
              aria-current={i === active}
              className={`overflow-hidden rounded-lg border transition-colors ${
                i === active ? 'border-brand-300' : 'border-ink-line hover:border-slate-500'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[16/10] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
