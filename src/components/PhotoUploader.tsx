'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import type { UploadMode } from '@/lib/storage';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_MB = 10;

interface Pending {
  id: string;
  name: string;
  progress: number;
}

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  mode: UploadMode;
  /** Hidden input name each photo is submitted under, in display order. */
  name?: string;
  max?: number;
  /** Optional caption per photo (e.g. a credit line). */
  captions?: Record<string, string>;
}

/**
 * Photo picker for listing forms. Files go straight from the browser to
 * storage (Vercel Blob in production), so large phone photos never pass
 * through a request-size-limited form post; the form only carries the
 * resulting links. The first photo is the cover.
 */
export default function PhotoUploader({ images, onChange, mode, name = 'keep_image', max = 20, captions = {} }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  // Uploads finish out of order; read the latest list rather than a stale prop.
  const latest = useRef(images);
  latest.current = images;

  const slots = max - images.length - pending.length;

  async function uploadOne(file: File): Promise<string> {
    if (mode === 'blob') {
      const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-60) || 'photo.jpg';
      const blob = await upload(`vehicles/${safe}`, file, {
        access: 'public',
        handleUploadUrl: '/api/uploads/blob',
        onUploadProgress: ({ percentage }) =>
          setPending((list) => list.map((p) => (p.name === file.name ? { ...p, progress: percentage } : p))),
      });
      return blob.url;
    }
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/uploads/local', { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? `Upload failed (${res.status})`);
    return json.url;
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const problems: string[] = [];
    const files = [...list].filter((f) => {
      if (!ACCEPT.split(',').includes(f.type)) { problems.push(`${f.name}: use JPG, PNG, WebP or AVIF`); return false; }
      if (f.size > MAX_MB * 1024 * 1024) { problems.push(`${f.name}: larger than ${MAX_MB} MB`); return false; }
      return true;
    });
    const accepted = files.slice(0, Math.max(slots, 0));
    if (files.length > accepted.length) problems.push(`Only ${max} photos per listing — ${files.length - accepted.length} not added.`);
    setErrors(problems);
    if (input.current) input.current.value = '';

    const batch = accepted.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, name: f.name, progress: 0 }));
    setPending((p) => [...p, ...batch]);

    await Promise.all(
      accepted.map(async (file, i) => {
        try {
          const url = await uploadOne(file);
          latest.current = [...latest.current, url];
          onChange(latest.current);
        } catch (err) {
          setErrors((e) => [...e, `${file.name}: ${(err as Error).message}`]);
        } finally {
          setPending((p) => p.filter((x) => x.id !== batch[i].id));
        }
      }),
    );
  }

  const move = (src: string) => onChange([src, ...images.filter((s) => s !== src)]);
  const remove = (src: string) => onChange(images.filter((s) => s !== src));

  if (mode === 'unavailable') {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Photo uploads are not set up on this site yet (Vercel Blob storage is missing).
        {images.map((src) => <input key={src} type="hidden" name={name} value={src} />)}
      </p>
    );
  }

  return (
    <div>
      {images.map((src) => <input key={src} type="hidden" name={name} value={src} />)}

      {(images.length > 0 || pending.length > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[16/10] w-full rounded-lg border border-ink-line object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-brand-300 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">
                  Cover
                </span>
              )}
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                {i > 0 ? (
                  <button type="button" onClick={() => move(src)} className="font-semibold text-slate-400 hover:text-brand-200">
                    Make cover
                  </button>
                ) : <span />}
                <button type="button" onClick={() => remove(src)} className="font-semibold text-red-400 hover:text-red-300" aria-label="Remove photo">
                  Remove
                </button>
              </div>
              {captions[src] && <p className="mt-0.5 truncate text-[11px] text-slate-500" title={captions[src]}>{captions[src]}</p>}
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="flex aspect-[16/10] flex-col items-center justify-center rounded-lg border border-dashed border-ink-line bg-ink px-2 text-center">
              <span className="w-full truncate text-[11px] text-slate-400">{p.name}</span>
              <span className="mt-1 text-xs font-semibold text-brand-300">{mode === 'blob' ? `${Math.round(p.progress)}%` : 'Uploading…'}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          id="photo-files"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={slots <= 0}
        />
        <label
          htmlFor="photo-files"
          className={`btn-ghost cursor-pointer ${slots <= 0 ? 'pointer-events-none opacity-50' : ''}`}
        >
          {images.length === 0 ? 'Add photos' : 'Add more photos'}
        </label>
        <span className="text-xs text-slate-500">
          {images.length}/{max} · JPG, PNG, WebP or AVIF up to {MAX_MB} MB each · first photo is the cover
        </span>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-xs text-red-400">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
