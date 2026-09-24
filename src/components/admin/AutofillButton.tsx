'use client';

import { useFormStatus } from 'react-dom';

export default function AutofillButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-ghost"
      disabled={pending}
      title="Finds and saves photos for every listing that is still on drawn placeholders"
    >
      {pending ? 'Finding photos…' : 'Auto-fill photos'}
    </button>
  );
}
