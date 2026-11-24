import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About DueNever',
  description: 'Learn about DueNever browser games and how to get in touch.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return <main className="min-h-screen bg-neutral-950 px-5 py-10 text-neutral-100"><div className="mx-auto max-w-3xl space-y-7">
    <Link href="/" className="text-sm text-neutral-300 underline">← Back to games</Link>
    <header><h1 className="mt-4 text-4xl font-black">About DueNever</h1><p className="mt-3 text-neutral-300">Browser games for a spare moment, with no installation or mandatory signup.</p></header>
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">What can I play?</h2><p>Find solo arcade and puzzle games, or play chess and Ludo with bots and friends in private rooms. Games and controls are listed in the library.</p></section>
    <section className="space-y-3 rounded-xl border border-neutral-700 bg-neutral-900 p-5"><h2 className="text-xl font-bold">Contact and feedback</h2><p>Report a problem or suggest an improvement through the <a className="text-lime-300 underline" href="https://github.com/Zelvior-Labs/duenever/issues">DueNever GitHub issue tracker</a>. Issues are public, so do not include room codes, credentials or sensitive personal information.</p></section>
    <p className="text-sm text-neutral-300"><Link href="/privacy" className="underline">Privacy information</Link></p>
  </div></main>;
}
