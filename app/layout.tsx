import type { Metadata, Viewport } from 'next';
import { getSiteConfig } from '@/lib/site-config';
import { SITE_URL } from '@/lib/site-url';
import './globals.css';

export const viewport: Viewport = { themeColor: '#111111' };

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  return {
    metadataBase: new URL(SITE_URL),
    title: cfg.site.title,
    description: cfg.site.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#111111] text-neutral-100 antialiased" style={{ '--accent': cfg.site.accent } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
