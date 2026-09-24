import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { favoritesForUser, listingsForUser } from '@/lib/queries';
import { withPhotosAll } from '@/lib/photos';
import { deleteListing, logout } from '@/lib/actions';
import { money, miles, shortDate } from '@/lib/format';
import ListingCard from '@/components/ListingCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const listings = listingsForUser(user.id);
  const saved = await withPhotosAll(favoritesForUser(user.id));

  return (
    <div className="wrap py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">My account</h1>
          <p className="mt-2 text-slate-400">
            Signed in as <span className="text-slate-200">{user.email}</span>
            {user.company ? ` · ${user.company}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sell" className="btn-primary">List a vehicle</Link>
          <form action={logout}>
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <section>
        <h2 className="text-xl">My listings ({listings.length})</h2>

        {listings.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="text-sm text-slate-400">You have not listed a vehicle yet.</p>
            <Link href="/sell" className="btn-primary mt-4">List your first vehicle</Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-3 pr-4">Vehicle</th>
                  <th scope="col" className="py-3 pr-4">Price</th>
                  <th scope="col" className="py-3 pr-4">Mileage</th>
                  <th scope="col" className="py-3 pr-4">Views</th>
                  <th scope="col" className="py-3 pr-4">Listed</th>
                  <th scope="col" className="py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-ink-line/60">
                    <td className="py-3 pr-4">
                      <Link href={`/listing/${l.slug}`} className="font-medium text-slate-100 hover:text-brand-200">
                        {l.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{money(l.price)}</td>
                    <td className="py-3 pr-4 text-slate-300">{miles(l.mileage)}</td>
                    <td className="py-3 pr-4 text-slate-300">{l.views}</td>
                    <td className="py-3 pr-4 text-slate-400">{shortDate(l.created_at)}</td>
                    <td className="py-3">
                      <form action={deleteListing}>
                        <input type="hidden" name="id" value={l.id} />
                        <button type="submit" className="text-xs font-medium text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl">Saved vehicles ({saved.length})</h2>

        {saved.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <p className="text-sm text-slate-400">
              Vehicles you save from a listing page appear here.
            </p>
            <Link href="/inventory" className="btn-ghost mt-4">Browse inventory</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
