import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AccountNav from '@/components/AccountNav';
import { EmailForm, PasswordForm, ProfileForm } from '@/components/SettingsForms';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile & settings', robots: { index: false } };

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account/settings');
  const isAdmin = user.role === 'admin';

  const section = (title: string, body: string, children: React.ReactNode) => (
    <section className="card p-6">
      <h2 className="text-lg">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-slate-400">{body}</p>
      {children}
    </section>
  );

  return (
    <div className="wrap py-10">
      <h1 className="mb-6 text-3xl sm:text-4xl">My account</h1>
      <AccountNav active="settings" isAdmin={isAdmin} />
      <div className="max-w-2xl space-y-6">
        {section('Profile', 'Your name and contact details.',
          <ProfileForm name={user.name} company={user.company ?? ''} phone={user.phone ?? ''} />)}
        {section('Email address', 'The address you sign in with.',
          <EmailForm email={user.email} adminNote={isAdmin} />)}
        {section('Password', 'Use at least 8 characters.', <PasswordForm />)}
      </div>
    </div>
  );
}
