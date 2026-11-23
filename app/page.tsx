import { HomePageClient } from '@/components/HomePageClient';
import { getSiteConfig } from '@/lib/site-config';

export const revalidate = 30;

export default async function HomePage() {
  const config = await getSiteConfig();
  return <HomePageClient config={config} />;
}
