import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/AuthForms';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage() {
  if (await currentUser()) redirect('/account');

  return (
    <div className="wrap flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl">Create your account</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Free for buyers and sellers. Takes about a minute.
        </p>

        <div className="card mt-7 p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
