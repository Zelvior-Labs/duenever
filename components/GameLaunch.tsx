'use client';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { Game } from '@/lib/games';
import { addStoredRecent, getStoredFavourites, setStoredFavourites } from '@/lib/storage';
const GameDetailModal = lazy(() => import('./GameDetailModal').then(m => ({ default: m.GameDetailModal })));
export function GameLaunch({ game }: { game: Game }) {
  const [open, setOpen] = useState(false);
  const [favourites, setFavourites] = useState<string[]>([]);
  useEffect(() => { setFavourites(getStoredFavourites()); }, []);
  const toggle = (id: string) => {
    const current = getStoredFavourites();
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    setStoredFavourites(next); setFavourites(next);
  };
  return <>{game.playable ? <button className="rounded-lg bg-lime-300 px-6 py-3 font-bold text-black hover:bg-lime-200" onClick={() => setOpen(true)}>Play {game.title}</button> : <p className="text-neutral-300">Coming soon</p>}
    {open && <Suspense fallback={<div role="status">Loading game…</div>}><GameDetailModal game={game} onClose={() => setOpen(false)} isFavourite={favourites.includes(game.id)} onToggleFavourite={toggle} onGameLaunched={addStoredRecent} autoLaunch /></Suspense>}
  </>;
}
