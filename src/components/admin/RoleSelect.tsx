'use client';

import { adminSetRole } from '@/lib/admin-actions';

export default function RoleSelect({ id, role }: { id: number; role: string }) {
  return (
    <form action={adminSetRole}>
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        defaultValue={role}
        aria-label="User role"
        className="field w-auto py-1.5 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
    </form>
  );
}
