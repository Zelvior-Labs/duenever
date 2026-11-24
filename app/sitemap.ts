import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/mcp', '/about', '/privacy'].map(path => ({ url: `${SITE_URL}${path || '/'}` }));
}
