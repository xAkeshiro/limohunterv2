/**
 * Where to send someone after signing in or up. Only same-site paths are
 * accepted, so a crafted ?next= cannot bounce a user to another domain.
 */
export function safeNextPath(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
