import type { Metadata } from 'next';
import type { Game } from './games';
import { SITE_URL } from './site-url';

// Add public informational routes here to give them metadata, social cards and sitemap entries.
export const PUBLIC_PAGES = {
  '/about': { title: 'About DueNever', description: 'Learn about DueNever browser games and how to get in touch.' },
  '/privacy': { title: 'Privacy at DueNever', description: 'How DueNever uses browser storage and private multiplayer rooms.' },
  '/mcp': { title: 'Play with an LLM | DueNever', description: 'Connect an assistant to a private chess or Ludo room.' },
} as const;
export type PageInfo = { title: string; description: string; path: string };
export function gamePageInfo(game: Game): PageInfo {
  return { title: `${game.title} | DueNever`, description: game.description, path: `/games/${game.slug}` };
}
export function pageMetadata({ title, description, path }: PageInfo): Metadata {
  const image = `/og?path=${encodeURIComponent(path)}`;
  return {
    title, description, alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'DueNever', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: `${title} on DueNever` }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
export function gameSchema(game: Game) {
  return { '@context': 'https://schema.org', '@type': 'VideoGame', name: game.title, description: game.description, url: `${SITE_URL}/games/${game.slug}`, gamePlatform: 'Web browser', genre: game.category };
}

export function gameFAQs(game: Game) {
  const questions = [{ question: `How do I play ${game.title}?`, answer: game.controls.join('. ') }];
  if (game.playerCounts?.length) questions.push({ question: `How many players can play ${game.title}?`, answer: `Supported player counts: ${game.playerCounts.join(', ')}.` });
  return questions;
}
export function gameStructuredData(game: Game) {
  const page = `${SITE_URL}/games/${game.slug}`;
  return { '@context': 'https://schema.org', '@graph': [
    { ...gameSchema(game), '@context': undefined },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Games', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: game.title, item: page },
    ] },
    { '@type': 'FAQPage', mainEntity: gameFAQs(game).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ] };
}
