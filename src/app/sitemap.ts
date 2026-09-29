import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
import { parseTimestamp } from '@/lib/format';
import { searchListings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes = ['', '/inventory', '/sell', '/finance', '/compare', '/about', '/contact'].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
    }),
  );

  const listings = (await searchListings({ per_page: 60, page: 1 })).items.map((l) => ({
    url: `${base}/listing/${l.slug}`,
    lastModified: parseTimestamp(l.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...listings];
}
