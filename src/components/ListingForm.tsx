'use client';

import { useActionState, useState } from 'react';
import { keepValues } from '@/components/keepValues';
import Link from 'next/link';
import { createListing, updateMyListing, type FormState } from '@/lib/actions';
import FormMessage, { FieldError } from './FormMessage';
import PhotoUploader from './PhotoUploader';
import { BODY_STYLES, isPlaceholder, type ListingView } from '@/lib/types';
import type { UploadMode } from '@/lib/storage';

const INITIAL: FormState = { ok: false, message: '' };

const CONDITIONS = ['Used', 'Certified', 'Restored', 'New', 'Project'];
const FUELS = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];

interface Props {
  uploadMode: UploadMode;
  sellerName?: string;
  sellerPhone?: string;
  /** Present when editing an existing listing. */
  listing?: ListingView;
}

export default function ListingForm({ uploadMode, sellerName = '', sellerPhone = '', listing }: Props) {
  const editing = Boolean(listing);
  const [state, action, pending] = useActionState(editing ? updateMyListing : createListing, INITIAL);
  // Drawn placeholders are not real photos, so an edit starts without them.
  const [images, setImages] = useState<string[]>((listing?.images ?? []).filter((src) => !isPlaceholder(src)));
  const v = listing;

  return (
    <form onSubmit={keepValues(action)} className="space-y-6">
      <FormMessage state={state} />
      {editing && <input type="hidden" name="id" value={listing!.id} />}

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Photos
        </legend>
        <p className="mb-3 mt-1 text-sm text-slate-400">
          Add at least one photo of the vehicle itself — exterior, interior and any features buyers
          will ask about. Listings with several clear photos get far more inquiries.
        </p>
        <PhotoUploader images={images} onChange={setImages} mode={uploadMode} />
        <FieldError message={state.errors?.images} />
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Vehicle
        </legend>

        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="title">Listing title</label>
            <input
              id="title" name="title" className="field" required defaultValue={v?.title}
              placeholder='2019 Cadillac XTS 70" Stretch Limousine'
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="body_style">Vehicle type</label>
              <select id="body_style" name="body_style" className="field" required defaultValue={v?.body_style ?? ''}>
                <option value="" disabled>Choose…</option>
                {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError message={state.errors?.body_style} />
            </div>
            <div>
              <label className="label" htmlFor="make">Make</label>
              <input id="make" name="make" className="field" required defaultValue={v?.make} placeholder="Cadillac" />
              <FieldError message={state.errors?.make} />
            </div>
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input id="model" name="model" className="field" required defaultValue={v?.model} placeholder="XTS" />
              <FieldError message={state.errors?.model} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="year">Year</label>
              <input id="year" name="year" type="number" className="field" required defaultValue={v?.year} placeholder="2019" />
              <FieldError message={state.errors?.year} />
            </div>
            <div>
              <label className="label" htmlFor="price">Asking price (USD)</label>
              <input id="price" name="price" type="number" className="field" required defaultValue={v?.price} placeholder="62500" />
              <FieldError message={state.errors?.price} />
            </div>
            <div>
              <label className="label" htmlFor="mileage">Mileage</label>
              <input id="mileage" name="mileage" type="number" className="field" required defaultValue={v?.mileage} placeholder="78400" />
              <FieldError message={state.errors?.mileage} />
            </div>
            <div>
              <label className="label" htmlFor="passengers">Passengers</label>
              <input id="passengers" name="passengers" type="number" className="field" required defaultValue={v?.passengers} placeholder="8" />
              <FieldError message={state.errors?.passengers} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="condition">Condition</label>
              <select id="condition" name="condition" className="field" defaultValue={v?.condition ?? 'Used'}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fuel">Fuel</label>
              <select id="fuel" name="fuel" className="field" defaultValue={v?.fuel ?? 'Gasoline'}>
                {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="exterior_color">Exterior color</label>
              <input id="exterior_color" name="exterior_color" className="field" defaultValue={v?.exterior_color ?? 'Black'} />
            </div>
            <div>
              <label className="label" htmlFor="interior_color">Interior color</label>
              <input id="interior_color" name="interior_color" className="field" defaultValue={v?.interior_color ?? 'Black'} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" className="field" required defaultValue={v?.city} placeholder="Naperville" />
              <FieldError message={state.errors?.city} />
            </div>
            <div>
              <label className="label" htmlFor="state">State (2-letter)</label>
              <input id="state" name="state" className="field" required defaultValue={v?.state} maxLength={2} placeholder="IL" />
              <FieldError message={state.errors?.state} />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Details
        </legend>

        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description" name="description" rows={6} className="field" required defaultValue={v?.description}
              placeholder="Condition, service history, recent work, why you're selling…"
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div>
            <label className="label" htmlFor="features">Features — one per line</label>
            <textarea
              id="features" name="features" rows={5} className="field" defaultValue={v?.features.join('\n')}
              placeholder={'Fiber optic lighting\nRear bar\nPrivacy divider'}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Contact
        </legend>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="seller_name">Seller name</label>
            <input id="seller_name" name="seller_name" className="field" required defaultValue={v?.seller_name ?? sellerName} />
            <FieldError message={state.errors?.seller_name} />
          </div>
          <div>
            <label className="label" htmlFor="seller_phone">Phone</label>
            <input id="seller_phone" name="seller_phone" className="field" required defaultValue={v?.seller_phone ?? sellerPhone} placeholder="253-314-7568" />
            <FieldError message={state.errors?.seller_phone} />
          </div>
        </div>
      </fieldset>

      {editing && (
        <label className="flex items-center gap-2.5 text-sm text-slate-300">
          <input type="checkbox" name="sold" defaultChecked={v?.sold === 1} className="h-4 w-4 rounded border-ink-line bg-ink accent-brand-300" />
          This vehicle has sold (frees up a listing slot on your plan)
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || images.length === 0}>
          {pending ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish listing'}
        </button>
        {images.length === 0 && <p className="text-xs text-amber-300">Add at least one photo to continue.</p>}
        {editing && <Link href="/account" className="btn-ghost">Cancel</Link>}
      </div>
    </form>
  );
}
