import type { Metadata } from 'next';
import { HomePageClient } from '@/components/HomePageClient';
import { getSiteConfig } from '@/lib/site-config';
import { SITE_URL } from '@/lib/site-url';

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const title = config.site.title;
  const description = config.site.description;
  return {
    alternates: { canonical: '/' },
    openGraph: { title, description, url: '/', siteName: 'DueNever', type: 'website', images: [{ url: '/social-preview.jpg', width: 1200, height: 630, alt: 'DueNever browser games' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/social-preview.jpg'] },
  };
}

export default async function HomePage() {
  const config = await getSiteConfig();
  const data = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'DueNever', url: SITE_URL, description: config.site.description };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} /><HomePageClient config={config} /></>;
}
