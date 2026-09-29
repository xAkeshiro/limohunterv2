export function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function miles(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} mi`;
}

/**
 * Parses stored timestamps: ISO strings from Postgres, or the older
 * "YYYY-MM-DD HH:MM:SS" UTC form, which carries no zone marker.
 */
export function parseTimestamp(value: string): Date {
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(value);
  return new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
}

export function shortDate(iso: string): string {
  const d = parseTimestamp(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Standard amortized monthly payment.
 * Falls back to straight division when the rate is zero.
 */
export function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}
