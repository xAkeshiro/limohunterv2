import type { Metadata } from 'next';
import AdminListingForm from '@/components/admin/AdminListingForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add listing' };

export default function NewListingPage() {
  return (
    <div>
      <h2 className="text-xl">Add a listing</h2>
      <p className="mt-1 text-sm text-slate-400">
        Create a listing directly. It publishes immediately and appears in the public inventory.
      </p>
      <div className="mt-6">
        <AdminListingForm />
      </div>
    </div>
  );
}
