'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { adminCreateListing, adminUpdateListing } from '@/lib/admin-actions';
import type { FormState } from '@/lib/actions';
import type { ListingView } from '@/lib/types';
import { BODY_STYLES } from '@/lib/types';
import FormMessage, { FieldError } from '@/components/FormMessage';

const INITIAL: FormState = { ok: false, message: '' };
const CONDITIONS = ['Used', 'Certified', 'Restored', 'New', 'Project'];
const FUELS = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];
const DRIVETRAINS = ['RWD', 'FWD', 'AWD', '4WD'];
const TRANSMISSIONS = ['Automatic', 'Manual'];

export default function AdminListingForm({ listing }: { listing?: ListingView }) {
  const editing = Boolean(listing);
  const [state, action, pending] = useActionState(
    editing ? adminUpdateListing : adminCreateListing,
    INITIAL,
  );

  // Photos the editor has chosen to keep; removing one just drops it from this list.
  const [images, setImages] = useState<string[]>(listing?.images ?? []);

  const err = (k: string) => state.errors?.[k];

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      {editing && <input type="hidden" name="id" value={listing!.id} />}

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">Vehicle</legend>
        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="title">Listing title</label>
            <input id="title" name="title" className="field" required defaultValue={listing?.title} />
            <FieldError message={err('title')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="body_style">Vehicle type</label>
              <select id="body_style" name="body_style" className="field" required defaultValue={listing?.body_style ?? ''}>
                <option value="" disabled>Choose…</option>
                {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError message={err('body_style')} />
            </div>
            <div>
              <label className="label" htmlFor="make">Make</label>
              <input id="make" name="make" className="field" required defaultValue={listing?.make} />
              <FieldError message={err('make')} />
            </div>
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input id="model" name="model" className="field" required defaultValue={listing?.model} />
              <FieldError message={err('model')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="year">Year</label>
              <input id="year" name="year" type="number" className="field" required defaultValue={listing?.year} />
              <FieldError message={err('year')} />
            </div>
            <div>
              <label className="label" htmlFor="price">Price (USD)</label>
              <input id="price" name="price" type="number" className="field" required defaultValue={listing?.price} />
              <FieldError message={err('price')} />
            </div>
            <div>
              <label className="label" htmlFor="mileage">Mileage</label>
              <input id="mileage" name="mileage" type="number" className="field" required defaultValue={listing?.mileage} />
              <FieldError message={err('mileage')} />
            </div>
            <div>
              <label className="label" htmlFor="passengers">Passengers</label>
              <input id="passengers" name="passengers" type="number" className="field" required defaultValue={listing?.passengers} />
              <FieldError message={err('passengers')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="condition">Condition</label>
              <select id="condition" name="condition" className="field" defaultValue={listing?.condition ?? 'Used'}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fuel">Fuel</label>
              <select id="fuel" name="fuel" className="field" defaultValue={listing?.fuel ?? 'Gasoline'}>
                {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="transmission">Transmission</label>
              <select id="transmission" name="transmission" className="field" defaultValue={listing?.transmission ?? 'Automatic'}>
                {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="drivetrain">Drivetrain</label>
              <select id="drivetrain" name="drivetrain" className="field" defaultValue={listing?.drivetrain ?? 'RWD'}>
                {DRIVETRAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="exterior_color">Exterior</label>
              <input id="exterior_color" name="exterior_color" className="field" defaultValue={listing?.exterior_color ?? 'Black'} />
            </div>
            <div>
              <label className="label" htmlFor="interior_color">Interior</label>
              <input id="interior_color" name="interior_color" className="field" defaultValue={listing?.interior_color ?? 'Black'} />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" className="field" required defaultValue={listing?.city} />
              <FieldError message={err('city')} />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <input id="state" name="state" className="field" required maxLength={2} defaultValue={listing?.state} />
              <FieldError message={err('state')} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="vin">VIN (optional)</label>
            <input id="vin" name="vin" className="field" defaultValue={listing?.vin ?? ''} />
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">Photos</legend>

        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((src) => (
              <div key={src} className="relative">
                <input type="hidden" name="keep_image" value={src} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-[16/10] w-full rounded-lg border border-ink-line object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((p) => p !== src))}
                  className="absolute right-1.5 top-1.5 rounded-md bg-ink/90 px-2 py-1 text-[11px] font-semibold text-red-300 hover:text-red-200"
                  aria-label="Remove this photo"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <label className="label" htmlFor="photos">Upload photos</label>
          <input
            id="photos" name="photos" type="file" multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="field file:mr-3 file:rounded file:border-0 file:bg-brand-300 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            JPG, PNG, WebP or AVIF, up to 8&nbsp;MB each. New uploads are added to the photos kept above.
          </p>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">Details</legend>
        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={6} className="field" required defaultValue={listing?.description} />
            <FieldError message={err('description')} />
          </div>
          <div>
            <label className="label" htmlFor="features">Features — one per line</label>
            <textarea
              id="features" name="features" rows={5} className="field"
              defaultValue={listing?.features.join('\n')}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Seller &amp; publishing
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="seller_name">Seller name</label>
            <input id="seller_name" name="seller_name" className="field" required defaultValue={listing?.seller_name} />
            <FieldError message={err('seller_name')} />
          </div>
          <div>
            <label className="label" htmlFor="seller_phone">Seller phone</label>
            <input id="seller_phone" name="seller_phone" className="field" required defaultValue={listing?.seller_phone} />
            <FieldError message={err('seller_phone')} />
          </div>
        </div>

        {editing && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" name="status" className="field" defaultValue={listing?.status ?? 'published'}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 pt-6 text-sm text-slate-300">
              <input type="checkbox" name="featured" defaultChecked={listing?.featured === 1}
                     className="h-4 w-4 rounded border-ink-line bg-ink accent-brand-300" />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2.5 pt-6 text-sm text-slate-300">
              <input type="checkbox" name="sold" defaultChecked={listing?.sold === 1}
                     className="h-4 w-4 rounded border-ink-line bg-ink accent-brand-300" />
              Marked as sold
            </label>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create listing'}
        </button>
        <Link href="/admin/listings" className="btn-ghost">Back to listings</Link>
        {editing && (
          <Link href={`/listing/${listing!.slug}`} className="text-sm link-muted">
            View on site →
          </Link>
        )}
      </div>
    </form>
  );
}
