/**
 * Resolves the public base URL.
 *
 * An env var that is present but empty is treated as unset — `??` alone does
 * not catch that, and an empty string thrown at `new URL()` breaks the build.
 * Vercel injects VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL without a scheme,
 * so those are normalised here too.
 */
function firstUsable(...candidates: (string | undefined)[]): string | null {
  for (const raw of candidates) {
    const value = raw?.trim();
    if (value) return value;
  }
  return null;
}

export function siteUrl(): string {
  const configured = firstUsable(
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  );

  if (!configured) return 'http://localhost:3000';

  const withScheme = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;

  try {
    // Normalising through URL also rejects anything malformed before it spreads.
    return new URL(withScheme).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function siteUrlObject(): URL {
  return new URL(siteUrl());
}
