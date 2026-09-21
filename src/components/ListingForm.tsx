'use client';

import { useActionState } from 'react';
import { createListing, type FormState } from '@/lib/actions';
import FormMessage, { FieldError } from './FormMessage';
import { BODY_STYLES } from '@/lib/types';

const INITIAL: FormState = { ok: false, message: '' };

const CONDITIONS = ['Used', 'Certified', 'Restored', 'New', 'Project'];
const FUELS = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];

export default function ListingForm({ sellerName = '', sellerPhone = '' }) {
  const [state, action, pending] = useActionState(createListing, INITIAL);

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />

      <fieldset className="card p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
          Vehicle
        </legend>

        <div className="mt-3 space-y-4">
          <div>
            <label className="label" htmlFor="title">Listing title</label>
            <input
              id="title" name="title" className="field" required
              placeholder='2019 Cadillac XTS 70" Stretch Limousine'
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="body_style">Vehicle type</label>
              <select id="body_style" name="body_style" className="field" required defaultValue="">
                <option value="" disabled>Choose…</option>
                {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <FieldError message={state.errors?.body_style} />
            </div>
            <div>
              <label className="label" htmlFor="make">Make</label>
              <input id="make" name="make" className="field" required placeholder="Cadillac" />
              <FieldError message={state.errors?.make} />
            </div>
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input id="model" name="model" className="field" required placeholder="XTS" />
              <FieldError message={state.errors?.model} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="year">Year</label>
              <input id="year" name="year" type="number" className="field" required placeholder="2019" />
              <FieldError message={state.errors?.year} />
            </div>
            <div>
              <label className="label" htmlFor="price">Asking price (USD)</label>
              <input id="price" name="price" type="number" className="field" required placeholder="62500" />
              <FieldError message={state.errors?.price} />
            </div>
            <div>
              <label className="label" htmlFor="mileage">Mileage</label>
              <input id="mileage" name="mileage" type="number" className="field" required placeholder="78400" />
              <FieldError message={state.errors?.mileage} />
            </div>
            <div>
              <label className="label" htmlFor="passengers">Passengers</label>
              <input id="passengers" name="passengers" type="number" className="field" required placeholder="8" />
              <FieldError message={state.errors?.passengers} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="condition">Condition</label>
              <select id="condition" name="condition" className="field" defaultValue="Used">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fuel">Fuel</label>
              <select id="fuel" name="fuel" className="field" defaultValue="Gasoline">
                {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="exterior_color">Exterior color</label>
              <input id="exterior_color" name="exterior_color" className="field" defaultValue="Black" />
            </div>
            <div>
              <label className="label" htmlFor="interior_color">Interior color</label>
              <input id="interior_color" name="interior_color" className="field" defaultValue="Black" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" className="field" required placeholder="Naperville" />
              <FieldError message={state.errors?.city} />
            </div>
            <div>
              <label className="label" htmlFor="state">State (2-letter)</label>
              <input id="state" name="state" className="field" required maxLength={2} placeholder="IL" />
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
              id="description" name="description" rows={6} className="field" required
              placeholder="Condition, service history, recent work, why you're selling…"
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div>
            <label className="label" htmlFor="features">Features — one per line</label>
            <textarea
              id="features" name="features" rows={5} className="field"
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
            <input id="seller_name" name="seller_name" className="field" required defaultValue={sellerName} />
            <FieldError message={state.errors?.seller_name} />
          </div>
          <div>
            <label className="label" htmlFor="seller_phone">Phone</label>
            <input id="seller_phone" name="seller_phone" className="field" required defaultValue={sellerPhone} placeholder="253-314-7568" />
            <FieldError message={state.errors?.seller_phone} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Publishing…' : 'Publish listing'}
        </button>
        <p className="text-xs text-slate-500">
          Placeholder photography is applied automatically; swap in real photos after publishing.
        </p>
      </div>
    </form>
  );
}
