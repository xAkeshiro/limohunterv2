import Link from 'next/link';

/** Tabs shared by the account pages, so listings and settings are one click apart. */
export default function AccountNav({ active, isAdmin }: { active: 'overview' | 'settings'; isAdmin: boolean }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
        on ? 'border-brand-300 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Account" className="mb-8 flex gap-6 overflow-x-auto border-b border-ink-line">
      {tab('/account', 'Overview & listings', active === 'overview')}
      {tab('/account/settings', 'Profile & settings', active === 'settings')}
      {isAdmin && tab('/admin/listings', 'Manage all listings (admin)', false)}
    </nav>
  );
}
