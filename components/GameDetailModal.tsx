'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { Game } from '@/lib/games';
import { GameArt } from './GameArt';
import { RocketRampageGame } from './RocketRampageGame';
import { RuneBastionGame } from './RuneBastionGame';

/** Maps a playable game id to its live component. */
function PlayableGame({ id, onBack }: { id: string; onBack: () => void }) {
  if (id === 'rocket-rampage') return <RocketRampageGame onBack={onBack} />;
  if (id === 'rune-bastion') return <RuneBastionGame onBack={onBack} />;
  return null;
}

interface GameDetailModalProps {
  game: Game | null;
  onClose: () => void;
  isFavourite: boolean;
  onToggleFavourite: (gameId: string) => void;
  onGameLaunched: (gameId: string) => void;
  triggerRef?: HTMLElement | null;
  /** When true, launching the modal immediately starts the game (hero "Play now") */
  autoLaunch?: boolean;
}

export function GameDetailModal({
  game,
  onClose,
  isFavourite,
  onToggleFavourite,
  onGameLaunched,
  triggerRef,
  autoLaunch = false,
}: GameDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setSheetTranslateY(0);
  }, [game]);

  // Hero "Play now" → skip the details step and jump straight into the game
  // (onGameLaunched kept in a ref so parent re-renders can't re-trigger this)
  const onGameLaunchedRef = useRef(onGameLaunched);
  onGameLaunchedRef.current = onGameLaunched;

  useEffect(() => {
    if (game && autoLaunch) {
      onGameLaunchedRef.current(game.id);
      setIsPlaying(true);
    }
  }, [game, autoLaunch]);

  useEffect(() => {
    if (!game) return;

    // Remember previously focused element for restoration on close
    previouslyFocused.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) return; // the running game owns the keyboard

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const focusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game, onClose, isPlaying]);

  useEffect(() => {
    if (!game) return;
    // Move focus into the modal on open
    const focusable = modalRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [game]);

  // Restore focus to the trigger when closing
  useEffect(() => {
    return () => {
      if (triggerRef) {
        triggerRef.focus();
      } else if (previouslyFocused.current) {
        previouslyFocused.current.focus();
      }
    };
  }, [triggerRef]);

  if (!game) return null;

  const handleLaunch = () => {
    onGameLaunched(game.id);
    if (game.playable) {
      setIsPlaying(true);
    }
  };

  // Mobile swipe-to-dismiss sheet handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setSheetTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetTranslateY > 120) {
      onClose();
    } else {
      setSheetTranslateY(0);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          ref={modalRef}
          onClick={e => e.stopPropagation()}
          style={{
            transform: sheetTranslateY > 0 ? `translateY(${sheetTranslateY}px)` : undefined,
            transition: isDragging.current ? 'none' : 'transform 200ms ease-out',
          }}
          className="w-full max-w-2xl bg-neutral-900 border-t-2 sm:border-2 border-neutral-700 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden font-sans text-neutral-100 max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        >
          {/* Drag handle on mobile */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="sm:hidden w-full py-2.5 flex justify-center cursor-grab active:cursor-grabbing bg-neutral-950 border-b border-neutral-800"
          >
            <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
          </div>

          <div className="overflow-y-auto flex-1 p-5 sm:p-6">
            {/* Header / Art banner */}
            <div className="relative w-full h-44 sm:h-52 rounded-lg border border-neutral-700 overflow-hidden mb-5">
              <GameArt game={game} />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 bg-black/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full flex items-center justify-center border border-neutral-700 transition-colors cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & category */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--accent)] block mb-1">
                  {game.category}
                </span>
                <h2 id="modal-title" className="text-2xl font-bold text-neutral-100 font-sans tracking-tight">
                  {game.title}
                </h2>
              </div>

              <button
                onClick={() => onToggleFavourite(game.id)}
                className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isFavourite
                    ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[var(--accent)] text-[color:var(--accent)]'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
                aria-label={isFavourite ? 'Remove from saved' : 'Save game'}
              >
                <Heart className={`w-4 h-4 ${isFavourite ? 'fill-current text-[color:var(--accent)]' : ''}`} />
                <span>{isFavourite ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <p className="text-sm text-neutral-300 font-mono mb-4 leading-relaxed">{game.description}</p>

            {/* Controls & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-4 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs">
              <div>
                <span className="text-neutral-500 uppercase tracking-widest text-[10px] block mb-1.5">Controls</span>
                <ul className="space-y-1 text-neutral-300">
                  {game.controls.map((ctrl, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-[color:var(--accent)]">▸</span> {ctrl}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-neutral-500 uppercase tracking-widest text-[10px] block mb-1.5">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch / Status action */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
              <div className="text-xs font-mono text-neutral-400">
                {game.playable ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Playable right now in browser
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Coming soon (Catalogue preview)
                  </span>
                )}
              </div>

              {game.playable ? (
                <button
                  onClick={handleLaunch}
                  className="w-full sm:w-auto px-6 py-3 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  Play {game.title} →
                </button>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-6 py-3 bg-neutral-800 text-neutral-500 font-mono text-sm rounded-lg border border-neutral-700 cursor-not-allowed opacity-75"
                >
                  Coming soon
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen game overlay — sibling of the modal so `fixed` positioning isn't affected by the modal's backdrop-filter */}
        {isPlaying && <PlayableGame id={game.id} onBack={() => setIsPlaying(false)} />}
    </>
  );
}
