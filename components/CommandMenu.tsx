'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Game } from '@/lib/games';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSelectGame: (game: Game) => void;
  onSelectCategory: (category: string) => void;
  onShowSaved: () => void;
  onClearFilters: () => void;
  triggerRef?: HTMLElement | null;
}

export function CommandMenu({
  isOpen,
  onClose,
  games,
  onSelectGame,
  onSelectCategory,
  onShowSaved,
  onClearFilters,
  triggerRef,
}: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (triggerRef) {
        triggerRef.focus();
      } else if (previouslyFocused.current) {
        previouslyFocused.current.focus();
      }
    };
  }, [triggerRef]);

  if (!isOpen) return null;

  const actions = [
    { id: 'action-saved', title: 'View Saved Games', category: 'Action', run: () => onShowSaved() },
    { id: 'action-clear', title: 'Clear Search & Category Filters', category: 'Action', run: () => onClearFilters() },
    { id: 'cat-quick', title: 'Filter: Quick Games', category: 'Category', run: () => onSelectCategory('Quick') },
    { id: 'cat-puzzle', title: 'Filter: Puzzle Games', category: 'Category', run: () => onSelectCategory('Puzzle') },
    { id: 'cat-reflex', title: 'Filter: Reflex Games', category: 'Category', run: () => onSelectCategory('Reflex') },
    { id: 'cat-chill', title: 'Filter: Chill Games', category: 'Category', run: () => onSelectCategory('Chill') },
    { id: 'cat-two-player', title: 'Filter: Two-player Games', category: 'Category', run: () => onSelectCategory('Two-player') },
  ];

  const filteredGames = games
    .filter(g => g.title.toLowerCase().includes(query.toLowerCase()) || g.tags.some(t => t.toLowerCase().includes(query.toLowerCase())))
    .map(g => ({
      id: `game-${g.id}`,
      title: g.title,
      category: `Game (${g.category})`,
      run: () => onSelectGame(g),
    }));

  const filteredActions = actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  const allResults = [...filteredGames, ...filteredActions];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (allResults.length > 0 ? (prev + 1) % allResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const focusable = menuRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) focusable.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        ref={menuRef}
        className="w-full max-w-xl bg-neutral-900 border-2 border-neutral-700 rounded-lg shadow-2xl overflow-hidden font-sans text-neutral-100"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <span className="text-neutral-500 mr-2 text-sm font-mono">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a game title, category or command..."
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            aria-label="Command search"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-neutral-800/50">
          {allResults.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 font-mono">
              No matching games or commands found.
            </div>
          ) : (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded text-xs font-mono cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--accent)] text-black font-semibold' : 'text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <span className="truncate">{item.title}</span>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-800 text-[11px] font-mono text-neutral-500 flex justify-between">
          <span>Use ↑↓ to navigate</span>
          <span>↵ Select</span>
        </div>
      </div>
    </div>
  );
}
