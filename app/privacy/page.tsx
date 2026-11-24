import { pageMetadata, PUBLIC_PAGES } from '@/lib/seo';
import Link from 'next/link';

export const metadata = pageMetadata({ ...PUBLIC_PAGES['/privacy'], path: '/privacy' });

export default function PrivacyPage() {
  return <main className="min-h-screen bg-neutral-950 px-5 py-10 text-neutral-100"><div className="mx-auto max-w-3xl space-y-7">
    <Link href="/" className="text-sm text-neutral-300 underline">← Back to games</Link>
    <header><h1 className="mt-4 text-4xl font-black">Privacy at DueNever</h1><p className="mt-3 text-neutral-300">A practical overview of how the games use data.</p></header>
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">On your device</h2><p>Saved games, recent games, preferences and high scores are stored in your browser. Multiplayer room codes and seat credentials are kept in the current tab&apos;s session storage to let you resume. You can clear this data using your browser settings; clearing it may remove saved progress or room access.</p></section>
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">Private rooms</h2><p>Online chess and Ludo rooms send your chosen player name, room code and game actions to the server. The server stores room state, names and hashed seat credentials through Supabase. Rooms expire after 24 hours and expired records are cleaned up opportunistically when new rooms are created. Share room codes only with people you trust.</p><p>When running a separate LAN server, room state is held by that server instead. LAN HTTP is unencrypted, so use a trusted network or HTTPS.</p></section>
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">Hosting and contact</h2><p>The site is hosted on Vercel and uses Supabase for online room storage and configuration. Hosting providers may process network and request information to operate and secure the service. If you connect an assistant to a room, its client and model provider may also receive room details.</p><p>For questions, use the <a href="https://github.com/Zelvior-Labs/duenever/issues" className="text-lime-300 underline">public issue tracker</a>; do not post room codes, credentials or sensitive personal information there.</p></section>
  </div></main>;
}
