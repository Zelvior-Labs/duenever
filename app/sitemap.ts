import type { MetadataRoute } from 'next';
import { GAMES } from '@/lib/games';
import { applyGameOverrides, getSiteConfig } from '@/lib/site-config';
import { PUBLIC_PAGES } from '@/lib/seo';
import { SITE_URL } from '@/lib/site-url';
export const revalidate = 30;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = applyGameOverrides(GAMES, await getSiteConfig());
  return ['/', ...Object.keys(PUBLIC_PAGES), ...games.map(game => `/games/${game.slug}`)].map(path => ({ url: `${SITE_URL}${path}` }));
}
