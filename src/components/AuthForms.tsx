'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type FormState } from '@/lib/actions';
import FormMessage, { FieldError } from './FormMessage';

const INITIAL: FormState = { ok: false, message: '' };

const withNext = (path: string, next?: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label className="label" htmlFor="login-email">Email</label>
        <input id="login-email" name="email" type="email" className="field" required autoComplete="email" />
      </div>

      <div>
        <label className="label" htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" className="field" required autoComplete="current-password" />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-400">
        No account?{' '}
        <Link href={withNext('/register', next)} className="font-semibold text-brand-300 hover:text-brand-200">
          Create one
        </Link>
      </p>
    </form>
  );
}

/** Deliberately minimal: name, email, password. Everything else can wait. */
export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(register, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label className="label" htmlFor="reg-name">Name</label>
        <input id="reg-name" name="name" className="field" required autoComplete="name" />
        <FieldError message={state.errors?.name} />
      </div>

      <div>
        <label className="label" htmlFor="reg-email">Email</label>
        <input id="reg-email" name="email" type="email" className="field" required autoComplete="email" />
        <FieldError message={state.errors?.email} />
      </div>

      <div>
        <label className="label" htmlFor="reg-password">Password</label>
        <input id="reg-password" name="password" type="password" className="field" required autoComplete="new-password" minLength={8} />
        <FieldError message={state.errors?.password} />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href={withNext('/login', next)} className="font-semibold text-brand-300 hover:text-brand-200">
          Sign in
        </Link>
      </p>
    </form>
  );
}
