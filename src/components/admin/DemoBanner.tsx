import { isEphemeral } from '@/lib/db';
import { usingBlob } from '@/lib/storage';

/**
 * Shown only when the site is running without a hosted database, so nothing
 * an admin does there looks permanent when it is not.
 */
export default function DemoBanner() {
  if (!isEphemeral()) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="text-sm font-semibold text-amber-200">No database connected — changes are temporary</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-amber-100/80">
        This deployment has no <code className="font-mono text-xs">DATABASE_URL</code>, so it runs on a
        temporary built-in database that resets whenever the server restarts. Accounts, subscriptions
        and listings made here will not last. Add a Postgres connection string (for example from
        Supabase) in the Vercel project settings and redeploy.
        {!usingBlob() && ' Photo uploads also need BLOB_READ_WRITE_TOKEN to persist.'}
      </p>
    </div>
  );
}
