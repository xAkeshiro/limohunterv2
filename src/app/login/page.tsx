import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/AuthForms';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/account');

  return (
    <div className="wrap flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl">Sign in</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Manage your listings, saved vehicles and inquiries.
        </p>

        <div className="card mt-7 p-6">
          <LoginForm />
        </div>

        <p className="mt-5 rounded-lg border border-ink-line bg-ink-soft px-4 py-3 text-center text-xs text-slate-400">
          Seller demo: <span className="font-mono text-slate-200">demo@fleetmarketplace.com</span>
          <br />
          Admin demo: <span className="font-mono text-slate-200">admin@fleetmarketplace.com</span>
          <br />
          Password for both: <span className="font-mono text-slate-200">demo1234</span>
        </p>
      </div>
    </div>
  );
}
