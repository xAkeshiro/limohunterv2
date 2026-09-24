import { needsPhotos, type ImageCredit, type ListingView } from './types';

/**
 * Finds real, freely licensed photographs of a listing's make and model on
 * Wikimedia Commons. Every file there carries a free license, most of which
 * require attribution, so each photo comes back with its credit attached and
 * the site displays it.
 *
 * Runs server-side only. Failures never throw: a listing that cannot be
 * matched simply keeps its drawn placeholder.
 */

export interface Photo extends ImageCredit {
  width: number;
  height: number;
}

const WEEK = 60 * 60 * 24 * 7;
const REQUEST_TIMEOUT_MS = 3500;
const MAX_CONCURRENT = 4;
const MIN_WIDTH = 800;

/** After a network failure, skip lookups briefly instead of stalling every page. */
const COOL_OFF_MS = 60_000;

function apiUrl(): string {
  return process.env.COMMONS_API_URL?.trim() || 'https://commons.wikimedia.org/w/api.php';
}

/** Wikimedia asks API clients to identify themselves with a descriptive agent. */
function userAgent(): string {
  const contact = process.env.WIKIMEDIA_CONTACT?.trim() || 'demo marketplace';
  return `FleetMarketplace/1.0 (${contact})`;
}

export function autoPhotosEnabled(): boolean {
  const flag = process.env.AUTO_PHOTOS?.trim().toLowerCase();
  return flag !== '0' && flag !== 'false' && flag !== 'off';
}

/* ------------------------------------------------------------ query plan */

/** Word added to make + model so a stretch build is not matched to the base car. */
const BODY_KEYWORD: Record<string, string> = {
  'Stretch Limousine': 'limousine',
  'SUV Stretch': 'limousine',
  'Shuttle Bus': 'bus',
  'Party Bus': 'bus',
  Motorcoach: 'coach',
};

/**
 * Conversions look nothing like the vehicle they are built on, so a bare
 * "Ford F-550" search (a pickup) must never stand in for a party bus.
 */
const CONVERSIONS = new Set(['Stretch Limousine', 'SUV Stretch', 'Shuttle Bus', 'Party Bus']);

/** Last resort per class when nothing matches the specific model. */
const CLASS_FALLBACK: Record<string, string> = {
  'Stretch Limousine': 'stretch limousine',
  'SUV Stretch': 'Hummer limousine',
  Sedan: 'Cadillac XTS',
  SUV: 'Cadillac Escalade',
  'Shuttle Bus': 'shuttle bus',
  Motorcoach: 'motorcoach',
  'Sprinter Van': 'Mercedes-Benz Sprinter',
  'Party Bus': 'party bus',
  'CEO Mobile Office': 'Mercedes-Benz Sprinter van',
  Antique: 'Rolls-Royce Silver Cloud',
};

interface PlannedQuery {
  q: string;
  /** Tokens a file title must contain for a model-specific search to count. */
  mustMatch: string[];
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function queryPlan(l: Pick<ListingView, 'make' | 'model' | 'body_style'>): PlannedQuery[] {
  const make = l.make.trim();
  const model = l.model.trim();
  const keyword = BODY_KEYWORD[l.body_style] ?? '';
  const makeToken = norm(make.split(/[\s-]/)[0] ?? '');
  const modelToken = norm(model.split(/\s/)[0] ?? '');
  const mustMatch = [makeToken, modelToken].filter((t) => t.length >= 2);

  const plan: PlannedQuery[] = [];
  const add = (q: string, match: string[]) => {
    const clean = q.replace(/\s+/g, ' ').trim();
    if (clean && !plan.some((p) => p.q === clean)) plan.push({ q: clean, mustMatch: match });
  };

  add(`${make} ${model} ${keyword}`, mustMatch);

  if (!CONVERSIONS.has(l.body_style)) {
    add(`${make} ${model}`, mustMatch);
    // "Escalade ESV" -> "Escalade": trims rarely appear in file names.
    const baseModel = model.split(/\s/)[0] ?? '';
    if (baseModel.length >= 3 && baseModel !== model) add(`${make} ${baseModel}`, mustMatch);
  }

  const fallback = CLASS_FALLBACK[l.body_style];
  if (fallback) add(fallback, []);

  return plan;
}

/* --------------------------------------------------------------- parsing */

/** Titles that are photos *of* the vehicle but not useful as a listing image. */
const UNWANTED =
  /logo|emblem|badge|ornament|engine|dashboard|interior|steering|wheel|seat|diagram|map|drawing|icon|sketch|scale model|model car|diecast|die-cast|toy|lego|1[:_ ]\d{2}\b/i;

const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface CommonsInfo {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, { value?: unknown } | undefined>;
}

interface CommonsPage {
  index?: number;
  title?: string;
  imageinfo?: CommonsInfo[];
}

interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
};

/** Commons metadata is HTML; credits are shown as plain text. */
export function plainText(value: unknown, max = 80): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function parseCommons(json: CommonsResponse, mustMatch: string[] = []): Photo[] {
  const pages = Object.values(json.query?.pages ?? {}).sort(
    (a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER),
  );

  const photos: Photo[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const title = page.title ?? '';
    if (!info || !info.descriptionurl) continue;

    const width = Number(info.width ?? 0);
    const height = Number(info.height ?? 0);
    if (!MIMES.has(info.mime ?? '')) continue;
    if (width < MIN_WIDTH || height <= 0) continue;
    // Listing cards are landscape; portrait shots crop badly.
    if (width < height * 1.15) continue;
    if (UNWANTED.test(title)) continue;
    if (mustMatch.length > 0 && !mustMatch.some((t) => norm(title).includes(t))) continue;

    const src = info.thumburl || info.url;
    if (!src) continue;

    const meta = info.extmetadata ?? {};
    const licenseUrl = typeof meta.LicenseUrl?.value === 'string' ? meta.LicenseUrl.value : null;

    photos.push({
      src,
      width,
      height,
      author: plainText(meta.Artist?.value) || 'Unknown author',
      license: plainText(meta.LicenseShortName?.value, 40) || 'See source',
      licenseUrl,
      sourceUrl: info.descriptionurl,
    });
  }
  return photos;
}

/* ------------------------------------------------------------- fetching */

let lastFailureAt = 0;
let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

type SearchOutcome = { ok: true; photos: Photo[] } | { ok: false };

const memo = new Map<string, { at: number; value: Promise<SearchOutcome> }>();
const MEMO_TTL_MS = 6 * 60 * 60 * 1000;

export function clearPhotoCache(): void {
  memo.clear();
  lastFailureAt = 0;
}

async function requestCommons(query: string, limit: number): Promise<SearchOutcome> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '1',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(Math.min(limit * 4, 40)),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1280',
    origin: '*',
  });

  try {
    const res = await slot(() =>
      fetch(`${apiUrl()}?${params}`, {
        headers: { 'User-Agent': userAgent(), 'Api-User-Agent': userAgent() },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: WEEK },
      } as RequestInit),
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as CommonsResponse;
    return { ok: true, photos: parseCommons(json) };
  } catch {
    lastFailureAt = Date.now();
    return { ok: false };
  }
}

/** Unfiltered results for one query, memoised so shared models cost one call. */
function searchRaw(query: string, limit: number): Promise<SearchOutcome> {
  const key = `${query}::${limit}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.value;

  const value = requestCommons(query, limit).then((outcome) => {
    // A failure is not worth remembering; the next request should retry.
    if (!outcome.ok) memo.delete(key);
    return outcome;
  });
  memo.set(key, { at: Date.now(), value });
  return value;
}

/** The file name is the only descriptive text Commons search results carry. */
function fileTitle(sourceUrl: string): string {
  const tail = sourceUrl.split('/').pop() ?? sourceUrl;
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}

function coolingOff(): boolean {
  return Date.now() - lastFailureAt < COOL_OFF_MS;
}

/** Free-text search, used by the admin photo finder. */
export async function searchPhotos(query: string, limit = 12): Promise<Photo[]> {
  const q = query.trim();
  if (!q) return [];
  const outcome = await searchRaw(q, limit);
  return outcome.ok ? outcome.photos.slice(0, limit) : [];
}

/** Walks the query plan until it has enough distinct photos of the right vehicle. */
export async function findPhotosForListing(
  l: Pick<ListingView, 'make' | 'model' | 'body_style'>,
  limit = 4,
): Promise<Photo[]> {
  if (coolingOff()) return [];

  const found: Photo[] = [];
  for (const step of queryPlan(l)) {
    const outcome = await searchRaw(step.q, limit);
    // A network failure will not be cured by the next query; stop here.
    if (!outcome.ok) break;

    const matching = step.mustMatch.length
      ? outcome.photos.filter((p) => step.mustMatch.some((t) => norm(fileTitle(p.sourceUrl)).includes(t)))
      : outcome.photos;

    for (const photo of matching) {
      if (!found.some((f) => f.src === photo.src)) found.push(photo);
      if (found.length >= limit) return found;
    }
    if (found.length > 0) return found;
  }
  return found;
}

export function toCredit(p: ImageCredit): ImageCredit {
  return { src: p.src, author: p.author, license: p.license, licenseUrl: p.licenseUrl, sourceUrl: p.sourceUrl };
}

/**
 * Swaps drawn placeholders for real photos at render time. Listings that
 * already have photos, stored or uploaded, are returned untouched.
 */
export async function withPhotos<T extends ListingView>(listing: T): Promise<T> {
  if (!autoPhotosEnabled() || !needsPhotos(listing)) return listing;

  const photos = await findPhotosForListing(listing);
  if (photos.length === 0) return listing;

  return {
    ...listing,
    images: photos.map((p) => p.src),
    image_credits: photos.map(toCredit),
    photos_auto: true,
  };
}

export function withPhotosAll<T extends ListingView>(listings: T[]): Promise<T[]> {
  return Promise.all(listings.map(withPhotos));
}

/** One representative photo for a vehicle class, for the homepage tiles. */
export async function classPhoto(bodyStyle: string): Promise<string | null> {
  if (!autoPhotosEnabled() || coolingOff()) return null;
  const q = CLASS_FALLBACK[bodyStyle];
  if (!q) return null;
  const photos = await searchPhotos(q, 1);
  return photos[0]?.src ?? null;
}
