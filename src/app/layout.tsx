import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { currentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Fleet Marketplace — Largest second hand inventory in US',
    template: '%s | Fleet Marketplace',
  },
  description:
    'Buy and sell used limousines, SUV stretches, sprinter vans, shuttle buses and motorcoaches. The largest second-hand limousine inventory in the US.',
  openGraph: {
    type: 'website',
    siteName: 'Fleet Marketplace',
    title: 'Fleet Marketplace — Largest second hand inventory in US',
    description:
      'Buy and sell used limousines, SUV stretches, sprinter vans, shuttle buses and motorcoaches.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader userName={user?.name ?? null} isAdmin={user?.role === 'admin'} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
