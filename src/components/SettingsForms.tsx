'use client';

import { useActionState } from 'react';
import { keepValues, useResetOnSuccess } from '@/components/keepValues';
import { changeEmail, changePassword, updateProfile, type FormState } from '@/lib/actions';
import FormMessage, { FieldError } from './FormMessage';

const INITIAL: FormState = { ok: false, message: '' };

export function ProfileForm({ name, company, phone }: { name: string; company: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="set-name">Name</label>
        <input id="set-name" name="name" className="field" required defaultValue={name} autoComplete="name" />
        <FieldError message={state.errors?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="set-company">Company (optional)</label>
          <input id="set-company" name="company" className="field" defaultValue={company} autoComplete="organization" />
          <FieldError message={state.errors?.company} />
        </div>
        <div>
          <label className="label" htmlFor="set-phone">Phone (optional)</label>
          <input id="set-phone" name="phone" type="tel" className="field" defaultValue={phone} autoComplete="tel" />
          <FieldError message={state.errors?.phone} />
        </div>
      </div>
      <p className="text-xs text-slate-500">Company and phone are used as the default contact details on new listings.</p>
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

export function EmailForm({ email, adminNote }: { email: string; adminNote: boolean }) {
  const [state, action, pending] = useActionState(changeEmail, INITIAL);
  const formRef = useResetOnSuccess(state);
  return (
    <form ref={formRef} onSubmit={keepValues(action)} className="space-y-4">
      <FormMessage state={state} />
      <p className="text-sm text-slate-400">Current email: <span className="text-slate-200">{email}</span></p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="set-email">New email</label>
          <input id="set-email" name="email" type="email" className="field" required autoComplete="email" />
          <FieldError message={state.errors?.email} />
        </div>
        <div>
          <label className="label" htmlFor="set-email-pw">Current password</label>
          <input id="set-email-pw" name="current_password" type="password" className="field" required autoComplete="current-password" />
          <FieldError message={state.errors?.current_password} />
        </div>
      </div>
      {adminNote && (
        <p className="text-xs text-amber-200/80">
          Admin: if ADMIN_EMAIL and ADMIN_PASSWORD are still set in Vercel, remove them after changing
          this — otherwise a fresh admin account with the old email is created on the next deploy.
        </p>
      )}
      <button type="submit" className="btn-ghost" disabled={pending}>{pending ? 'Changing…' : 'Change email'}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, INITIAL);
  const formRef = useResetOnSuccess(state);
  return (
    <form ref={formRef} onSubmit={keepValues(action)} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="set-pw-current">Current password</label>
        <input id="set-pw-current" name="current_password" type="password" className="field" required autoComplete="current-password" />
        <FieldError message={state.errors?.current_password} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="set-pw-new">New password</label>
          <input id="set-pw-new" name="new_password" type="password" className="field" required minLength={8} autoComplete="new-password" />
          <FieldError message={state.errors?.new_password} />
        </div>
        <div>
          <label className="label" htmlFor="set-pw-confirm">Confirm new password</label>
          <input id="set-pw-confirm" name="confirm_password" type="password" className="field" required minLength={8} autoComplete="new-password" />
          <FieldError message={state.errors?.confirm_password} />
        </div>
      </div>
      <button type="submit" className="btn-ghost" disabled={pending}>{pending ? 'Changing…' : 'Change password'}</button>
    </form>
  );
}
