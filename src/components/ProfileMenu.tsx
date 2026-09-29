'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/lib/actions';

interface Item {
  href: string;
  label: string;
}

const MEMBER: Item[] = [
  { href: '/account', label: 'My account' },
  { href: '/account#listings', label: 'My listings' },
  { href: '/account/settings', label: 'Profile & settings' },
  { href: '/subscriptions', label: 'Plan & billing' },
];

const ADMIN: Item[] = [
  { href: '/admin', label: 'Admin dashboard' },
  { href: '/admin/listings', label: 'Manage all listings' },
  { href: '/admin/users', label: 'Users' },
];

/** The signed-in user's menu: their own pages, admin tools if they have them, sign out. */
export default function ProfileMenu({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const link = (item: Item) => (
    <Link
      key={item.href}
      href={item.href}
      role="menuitem"
      onClick={() => setOpen(false)}
      className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-ink hover:text-brand-200"
    >
      {item.label}
    </Link>
  );

  return (
    <div ref={root} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-ghost max-w-[11rem]"
      >
        <span className="truncate">{userName.split(' ')[0]}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
             className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-ink-line bg-ink-soft p-1.5 shadow-2xl">
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-slate-500">Signed in as {userName}</p>
          {MEMBER.map(link)}
          {isAdmin && (
            <>
              <p className="mt-1 border-t border-ink-line px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-300">
                Admin
              </p>
              {ADMIN.map(link)}
            </>
          )}
          <form action={logout} className="mt-1 border-t border-ink-line pt-1">
            <button type="submit" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-400 hover:bg-ink hover:text-red-300">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
