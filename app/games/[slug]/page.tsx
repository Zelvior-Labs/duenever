import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { GAMES } from '@/lib/games';
import { applyGameOverrides, getSiteConfig } from '@/lib/site-config';
import { gamePageInfo, gameFAQs, gameStructuredData, jsonLd, pageMetadata } from '@/lib/seo';
import { GameLaunch } from '@/components/GameLaunch';
import { getGameStory } from '@/lib/game-stories';

export const revalidate = 30;
export function generateStaticParams() { return GAMES.map(game => ({ slug: game.slug })); }
async function findGame(slug: string) { return applyGameOverrides(GAMES, await getSiteConfig()).find(game => game.slug === slug); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const game = await findGame((await params).slug);
  return game ? pageMetadata(gamePageInfo(game)) : { title: 'Game not found', robots: { index: false } };
}
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const game = await findGame((await params).slug);
  if (!game) notFound();
  const story = getGameStory(game.id);
  return <main className="min-h-screen bg-neutral-950 px-5 py-10 text-neutral-100">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(gameStructuredData(game)) }} />
    <div className="mx-auto max-w-4xl space-y-7">
      <Link href="/" className="text-sm text-neutral-300 underline">← All games</Link>
      <div className="overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900">
        {game.art?.bannerImage && <img src={game.art.bannerImage} alt="" className="h-52 w-full object-cover sm:h-80" />}
        <div className="space-y-5 p-6 sm:p-8"><p className="font-mono text-xs font-bold uppercase tracking-widest text-lime-300">{game.category} · Browser game</p><h1 className="text-4xl font-black sm:text-5xl">{game.title}</h1><p className="text-lg text-neutral-200">{game.tagline}</p><p className="max-w-2xl leading-relaxed text-neutral-300">{game.description}</p><GameLaunch game={game} /></div>
      </div>
      {story && <section className="rounded-xl border border-neutral-700 bg-neutral-900 p-6"><p className="font-mono text-xs uppercase tracking-widest text-lime-300">The story</p><h2 className="mt-2 text-xl font-bold">{story.title}</h2><p className="mt-3 max-w-2xl leading-relaxed text-neutral-300">{story.introduction}</p></section>}
      <section className="rounded-xl border border-neutral-700 bg-neutral-900 p-6"><h2 className="text-xl font-bold">Game questions</h2><div className="mt-4 space-y-4">{gameFAQs(game).map(item => <div key={item.question}><h3 className="font-bold">{item.question}</h3><p className="mt-1 text-neutral-300">{item.answer}</p></div>)}</div></section>
    </div>
  </main>;
}
