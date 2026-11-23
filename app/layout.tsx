import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DueNever — Browser games for bored people',
  description: 'A lightweight browser-game platform for bored people. No installs or mandatory signup. Instant play on any hardware.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#111111] text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
