import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap flex flex-col items-center justify-center py-28 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-slate-400">
        The listing may have sold or the link may be out of date. Try the inventory for
        everything currently available.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/inventory" className="btn-primary">Browse inventory</Link>
        <Link href="/" className="btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
