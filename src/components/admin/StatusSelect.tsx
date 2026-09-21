'use client';

import { adminSetStatus } from '@/lib/admin-actions';

/**
 * Status dropdown that submits on change. Lives in a client component because
 * server components cannot carry event handlers.
 */
export default function StatusSelect({ id, status }: { id: number; status: string }) {
  return (
    <form action={adminSetStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        aria-label="Listing status"
        className="field w-auto py-1.5 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
    </form>
  );
}
