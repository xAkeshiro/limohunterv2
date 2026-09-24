export type BodyStyle =
  | 'Stretch Limousine'
  | 'SUV Stretch'
  | 'Sedan'
  | 'SUV'
  | 'Shuttle Bus'
  | 'Motorcoach'
  | 'Sprinter Van'
  | 'Party Bus'
  | 'CEO Mobile Office'
  | 'Antique';

export const BODY_STYLES: BodyStyle[] = [
  'Stretch Limousine',
  'SUV Stretch',
  'Sedan',
  'SUV',
  'Shuttle Bus',
  'Motorcoach',
  'Sprinter Van',
  'Party Bus',
  'CEO Mobile Office',
  'Antique',
];

export interface Listing {
  id: number;
  slug: string;
  title: string;
  body_style: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  passengers: number;
  condition: string;
  fuel: string;
  transmission: string;
  drivetrain: string;
  exterior_color: string;
  interior_color: string;
  vin: string | null;
  city: string;
  state: string;
  description: string;
  features: string;
  images: string;
  image_credits: string;
  seller_id: number | null;
  seller_name: string;
  seller_phone: string;
  featured: number;
  sold: number;
  status: string;
  views: number;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

export interface ListingFilters {
  q?: string;
  body_style?: string[];
  make?: string[];
  state?: string[];
  condition?: string[];
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  max_mileage?: number;
  min_passengers?: number;
  sort?: string;
  page?: number;
  per_page?: number;
}

/** Attribution for a photo that came from a freely licensed source. */
export interface ImageCredit {
  src: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

/** Parsed view of a listing row, with JSON columns decoded. */
export interface ListingView extends Omit<Listing, 'features' | 'images' | 'image_credits'> {
  features: string[];
  images: string[];
  image_credits: ImageCredit[];
  /** Set when the photos shown were sourced automatically rather than stored. */
  photos_auto?: boolean;
}

export function parseListing(row: Listing): ListingView {
  return {
    ...row,
    features: safeJson<string[]>(row.features, []),
    images: safeJson<string[]>(row.images, []),
    image_credits: safeJson<ImageCredit[]>(row.image_credits ?? '[]', []),
  };
}

/** The bundled drawings under /img are stand-ins, never real photography. */
export function isPlaceholder(src: string): boolean {
  return src.startsWith('/img/');
}

/**
 * True when any photo shown came from a stock source rather than being of the
 * actual vehicle, whether it was found at render time or stored by an admin.
 */
export function isRepresentative(listing: Pick<ListingView, 'images' | 'image_credits' | 'photos_auto'>): boolean {
  if (listing.photos_auto) return true;
  const credited = new Set(listing.image_credits.map((c) => c.src));
  return listing.images.some((src) => credited.has(src));
}

export function needsPhotos(listing: Pick<ListingView, 'images'>): boolean {
  return listing.images.length === 0 || listing.images.every(isPlaceholder);
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    const value = JSON.parse(raw);
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}
