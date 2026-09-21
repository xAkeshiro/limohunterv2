import Link from 'next/link';
import Logo from './Logo';

const COLUMNS = [
  {
    title: 'Buy',
    links: [
      { href: '/inventory', label: 'All inventory' },
      { href: '/inventory?body_style=Stretch+Limousine', label: 'Stretch limousines' },
      { href: '/inventory?body_style=SUV+Stretch', label: 'SUV stretches' },
      { href: '/inventory?body_style=Sprinter+Van', label: 'Sprinter vans' },
      { href: '/inventory?body_style=Motorcoach', label: 'Motorcoaches' },
      { href: '/compare', label: 'Compare vehicles' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { href: '/sell', label: 'List a vehicle' },
      { href: '/account', label: 'My listings' },
      { href: '/finance', label: 'Finance & insurance' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About LimoHunter' },
      { href: '/contact', label: 'Contact us' },
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Create account' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-line bg-ink-soft">
      <div className="wrap grid gap-10 py-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            The largest second-hand limousine and luxury transportation inventory in the US.
            Buy, sell and finance fleet vehicles in one place.
          </p>
          <a
            href="tel:+12533147568"
            className="mt-4 inline-block text-sm font-semibold text-brand-300 hover:text-brand-200"
          >
            (253) 314-7568
          </a>
          <p className="mt-1 text-xs text-slate-500">Monday – Friday, 9:00 AM – 5:00 PM</p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-sm link-muted">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-line">
        <div className="wrap flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} LimoHunter. All rights reserved.</p>
          <p>Vehicle listings shown are sample data for demonstration.</p>
        </div>
      </div>
    </footer>
  );
}
