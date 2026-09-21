'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/listings/new', label: 'Add listing', exact: true },
  { href: '/admin/inquiries', label: 'Inquiries' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-300 text-ink'
                    : 'text-slate-300 hover:bg-ink-soft hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
