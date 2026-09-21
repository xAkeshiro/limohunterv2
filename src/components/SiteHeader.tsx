'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from './Logo';

/** Short labels keep the desktop bar on one line; the drawer shows the same set. */
const NAV = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/sell', label: 'Sell' },
  { href: '/finance', label: 'Finance' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({
  userName,
  isAdmin = false,
}: {
  userName?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation happens, otherwise it stays open
  // over the new page on mobile.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/95 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Fleet Marketplace home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'text-brand-300' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="tel:+12533147568"
            className="hidden whitespace-nowrap text-sm font-semibold text-slate-200 hover:text-brand-200 xl:block"
          >
            (253) 314-7568
          </a>
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-brand-300 hover:text-brand-200 lg:inline-flex"
            >
              Admin
            </Link>
          )}
          {userName ? (
            <Link href="/account" className="btn-ghost hidden whitespace-nowrap sm:inline-flex">
              {userName.split(' ')[0]}
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost hidden whitespace-nowrap sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link href="/sell" className="btn-primary hidden whitespace-nowrap sm:inline-flex">
            List a vehicle
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-ink-line bg-ink lg:hidden" aria-label="Mobile">
          <div className="wrap flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-3 text-sm font-medium text-slate-200 hover:text-brand-200"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" className="rounded-lg px-2 py-3 text-sm font-semibold text-brand-300">
                Admin
              </Link>
            )}
            <div className="mt-2 flex gap-2 border-t border-ink-line pt-3">
              <Link href={userName ? '/account' : '/login'} className="btn-ghost flex-1">
                {userName ? 'My account' : 'Sign in'}
              </Link>
              <Link href="/sell" className="btn-primary flex-1">
                List a vehicle
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
