import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';
import AdminNav from '@/components/admin/AdminNav';
import DemoBanner from '@/components/admin/DemoBanner';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="wrap py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-line pb-5">
        <div>
          <h1 className="text-2xl">Administration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="text-slate-200">{admin.name}</span> · {admin.email}
          </p>
        </div>
        <Link href="/" className="btn-ghost">View public site</Link>
      </div>

      <DemoBanner />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
