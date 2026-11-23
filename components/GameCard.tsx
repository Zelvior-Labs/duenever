'use client';

import React, { forwardRef } from 'react';
import { Heart } from 'lucide-react';
import { Game } from '@/lib/games';
import { GameArt } from './GameArt';

interface GameCardProps {
  game: Game;
  isFavourite: boolean;
  onToggleFavourite: (gameId: string, e: React.MouseEvent) => void;
  onSelectGame: (game: Game) => void;
}

export const GameCard = forwardRef<HTMLDivElement, GameCardProps>(function GameCard(
  {
    game,
    isFavourite,
    onToggleFavourite,
    onSelectGame,
  }: GameCardProps,
  ref
) {
  const isFeatured = !!game.featured;

  return (
    <div
      onClick={() => onSelectGame(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectGame(game);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${game.title} - ${game.tagline}`}
      className={`group relative flex flex-col bg-neutral-900 border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        isFeatured
          ? 'border-[var(--accent)] shadow-[4px_4px_0px_0px_rgba(204,255,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(204,255,0,0.5)]'
          : 'border-neutral-800 hover:border-neutral-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* Featured pill banner if featured */}
      {isFeatured && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-[var(--accent)] text-black font-mono text-[10px] font-bold rounded tracking-wider uppercase shadow-xs">
          ★ Featured
        </div>
      )}

      {/* Playable badge indicator */}
      {game.playable && !isFeatured && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-emerald-400 text-black font-mono text-[10px] font-bold rounded tracking-wider uppercase shadow-xs">
          ▶ Playable
        </div>
      )}

      {/* Favourite action button (44px min touch area with hit-slop) */}
      <button
        onClick={(e) => onToggleFavourite(game.id, e)}
        className="absolute top-1.5 right-1.5 z-10 p-2 text-neutral-400 hover:text-[color:var(--accent)] bg-black/60 hover:bg-black/90 rounded-full transition-colors cursor-pointer"
        aria-label={isFavourite ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`}
        title={isFavourite ? 'Unsave' : 'Save'}
      >
        <Heart
          className={`w-4 h-4 transition-transform duration-150 active:scale-125 ${
            isFavourite ? 'fill-[var(--accent)] text-[color:var(--accent)]' : 'text-neutral-400'
          }`}
        />
      </button>

      {/* Card Artwork */}
      <div className="w-full h-36 bg-neutral-950 border-b border-neutral-800 relative">
        <GameArt game={game} />
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-sans font-bold text-base text-neutral-100 group-hover:text-[color:var(--accent)] transition-colors leading-snug">
            {game.title}
          </h3>
          <p className="font-mono text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
            {game.tagline}
          </p>
        </div>

        {/* Tags footer */}
        <div className="mt-3 pt-3 border-t border-neutral-850 flex items-center justify-between font-mono text-[11px] text-neutral-500">
          <span>{game.controls[0] || 'Browser'}</span>
          <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded text-[10px]">
            {game.category}
          </span>
        </div>
      </div>
    </div>
  );
});
