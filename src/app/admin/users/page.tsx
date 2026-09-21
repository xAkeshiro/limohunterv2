import type { Metadata } from 'next';
import { adminUsers, requireAdmin } from '@/lib/admin';
import { adminSetRole } from '@/lib/admin-actions';
import { shortDate } from '@/lib/format';
import RoleSelect from '@/components/admin/RoleSelect';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = adminUsers();

  return (
    <div>
      <h2 className="text-xl">Users</h2>
      <p className="mt-1 text-sm text-slate-400">
        {users.length} registered account{users.length === 1 ? '' : 's'}.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-3 pr-4">Name</th>
              <th scope="col" className="py-3 pr-4">Email</th>
              <th scope="col" className="py-3 pr-4">Company</th>
              <th scope="col" className="py-3 pr-4">Listings</th>
              <th scope="col" className="py-3 pr-4">Joined</th>
              <th scope="col" className="py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-line/60">
                <td className="py-3 pr-4 font-medium text-slate-100">{u.name}</td>
                <td className="py-3 pr-4 text-slate-300">{u.email}</td>
                <td className="py-3 pr-4 text-slate-400">{u.company ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-300">{u.listing_count}</td>
                <td className="py-3 pr-4 text-xs text-slate-400">{shortDate(u.created_at)}</td>
                <td className="py-3">
                  {u.id === me.id ? (
                    <span className="chip">You · admin</span>
                  ) : (
                    <RoleSelect id={u.id} role={u.role} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Your own role is locked so an administrator cannot remove their own access.
      </p>
    </div>
  );
}
