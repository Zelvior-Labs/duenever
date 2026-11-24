import type { Metadata } from 'next';
import { HomePageClient } from '@/components/HomePageClient';
import { getSiteConfig } from '@/lib/site-config';
import { SITE_URL } from '@/lib/site-url';
import { jsonLd, pageMetadata } from '@/lib/seo';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return pageMetadata({ title: config.site.title, description: config.site.description, path: '/' });
}

export default async function HomePage() {
  const config = await getSiteConfig();
  const data = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DueNever', url: SITE_URL, description: config.site.description };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} /><HomePageClient config={config} /></>;
}
