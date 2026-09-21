import type { FormState } from '@/lib/actions';

export default function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;

  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2.5 text-sm ${
        state.ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/40 bg-red-500/10 text-red-300'
      }`}
    >
      {state.message}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}
