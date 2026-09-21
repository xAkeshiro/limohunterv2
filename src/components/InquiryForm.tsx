'use client';

import { useActionState } from 'react';
import { submitInquiry, type FormState } from '@/lib/actions';
import FormMessage, { FieldError } from './FormMessage';

const INITIAL: FormState = { ok: false, message: '' };

interface Props {
  listingId?: number;
  kind?: string;
  title?: string;
  defaultMessage?: string;
}

export default function InquiryForm({ listingId, kind = 'listing', title, defaultMessage }: Props) {
  const [state, action, pending] = useActionState(submitInquiry, INITIAL);

  if (state.ok) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="space-y-3">
      {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
      <FormMessage state={state} />

      {listingId !== undefined && <input type="hidden" name="listing_id" value={listingId} />}
      <input type="hidden" name="kind" value={kind} />

      <div>
        <label className="label" htmlFor="iq-name">Full name</label>
        <input id="iq-name" name="name" className="field" required placeholder="Jane Doe" />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="iq-email">Email</label>
          <input id="iq-email" name="email" type="email" className="field" required placeholder="jane@company.com" />
          <FieldError message={state.errors?.email} />
        </div>
        <div>
          <label className="label" htmlFor="iq-phone">Phone (optional)</label>
          <input id="iq-phone" name="phone" type="tel" className="field" placeholder="(253) 314-7568" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="iq-message">Message</label>
        <textarea
          id="iq-message" name="message" rows={4} className="field" required
          defaultValue={defaultMessage}
          placeholder="I'd like more information about this vehicle."
        />
        <FieldError message={state.errors?.message} />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </button>
      <p className="text-xs text-slate-500">
        We typically respond within one business day, Monday–Friday 9:00 AM – 5:00 PM.
      </p>
    </form>
  );
}
