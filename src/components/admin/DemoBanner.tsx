import { isEphemeral } from '@/lib/db';
import { usingBlob } from '@/lib/storage';

/**
 * Makes the demo's persistence model visible, so an admin edit that vanishes
 * later is not a surprise.
 */
export default function DemoBanner() {
  if (!isEphemeral()) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="text-sm font-semibold text-amber-200">Demo database — edits are temporary</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-amber-100/80">
        This deployment has no hosted database yet, so it runs from the copy committed to the
        repository. Changes you make here are real and take effect immediately, but they live
        on a temporary copy and reset when the server instance recycles or you redeploy.
        {usingBlob()
          ? ' Uploaded photos go to Vercel Blob and are kept permanently — only the listing data resets.'
          : ' Photo uploads are being written to local disk, which will not persist here; set BLOB_READ_WRITE_TOKEN to store them properly.'}
      </p>
      <p className="mt-2 text-sm text-amber-100/80">
        To keep a set of changes, use <strong>Download database</strong> below and commit the
        file to <code className="font-mono text-xs">data/fleet-marketplace.db</code>. Connecting
        a hosted database removes this limitation.
      </p>
    </div>
  );
}
