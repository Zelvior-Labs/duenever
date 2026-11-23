'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { History, Trash2, X } from 'lucide-react';
import { Game, GAMES, CATEGORIES, GameCategory } from '@/lib/games';
import {
  getStoredFavourites,
  setStoredFavourites,
  getStoredRecents,
  addStoredRecent,
  clearStoredRecents,
  getStoredSettings,
  setStoredSettings,
  Settings,
  RecentItem,
} from '@/lib/storage';
import { Header } from './Header';
import { GameCard } from './GameCard';
import { GameDetailModal } from './GameDetailModal';
import { CommandMenu } from './CommandMenu';
import { UndoToast, ToastMessage } from './UndoToast';
import { GameArt } from './GameArt';
import { SiteConfig, applyGameOverrides } from '@/lib/site-config';

type SortOption = 'featured' | 'az' | 'recent';

export function HomePageClient({ config }: { config: SiteConfig }) {
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const [favourites, setFavourites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [settings, setSettings] = useState<Settings>(getStoredSettings());

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [clickedCardRef, setClickedCardRef] = useState<HTMLElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [, startTransition] = useTransition();

  // Catalog with Control Center overrides applied (hidden games removed)
  const games = useMemo(() => applyGameOverrides(GAMES, config), [config]);

  // Load local storage on hydration & listen for cross-tab storage changes (SWR)
  useEffect(() => {
    setFavourites(getStoredFavourites());
    setRecents(getStoredRecents());
    setSettings(getStoredSettings());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'duenever_favs_v1') setFavourites(getStoredFavourites());
      if (e.key === 'duenever_recents_v1') setRecents(getStoredRecents());
      if (e.key === 'duenever_settings_v1') setSettings(getStoredSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Favourite toggle with optimistic update & Undo toast
  const toggleFavourite = (gameId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isFav = favourites.includes(gameId);
    const updated = isFav ? favourites.filter(id => id !== gameId) : [...favourites, gameId];

    setFavourites(updated);
    setStoredFavourites(updated);

    const game = games.find(g => g.id === gameId);
    const gameName = game?.title || 'Game';

    if (isFav) {
      setToast({
        id: Date.now().toString(),
        text: `Removed ${gameName} from Saved`,
        onUndo: () => {
          const restored = [...updated, gameId];
          setFavourites(restored);
          setStoredFavourites(restored);
        },
      });
    } else {
      setToast({
        id: Date.now().toString(),
        text: `Saved ${gameName}`,
      });
    }
  };

  const handleGameLaunched = (gameId: string) => {
    const updated = addStoredRecent(gameId);
    setRecents(updated);
  };

  const handleClearRecents = () => {
    const prevRecents = [...recents];
    clearStoredRecents();
    setRecents([]);
    setToast({
      id: Date.now().toString(),
      text: 'Cleared recently played history',
      onUndo: () => {
        localStorage.setItem('duenever_recents_v1', JSON.stringify(prevRecents));
        setRecents(prevRecents);
      },
    });
  };

  const featuredGame = useMemo(() => games.find((g) => g.featured) ?? games[0], [games]);

  const playFeaturedNow = () => {
    if (!featuredGame) return;
    setAutoLaunch(true);
    setSelectedGame(featuredGame);
  };

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setStoredSettings(newSettings);
  };

  // Filtered & Sorted Games memo
  const filteredGames = useMemo(() => {
    let result = games;

    if (activeTab === 'saved') {
      result = result.filter(g => favourites.includes(g.id));
    }

    if (selectedCategory !== 'All') {
      result = result.filter(g => g.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        g =>
          g.title.toLowerCase().includes(q) ||
          g.tagline.toLowerCase().includes(q) ||
          g.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'recent') {
      const recentIds = recents.map(r => r.id);
      result = [...result].sort((a, b) => {
        const idxA = recentIds.indexOf(a.id);
        const idxB = recentIds.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    } else {
      // Featured first
      result = [...result].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [activeTab, selectedCategory, searchQuery, sortBy, favourites, recents]);

  const recentGames = useMemo(() => {
    return recents
      .map(r => games.find(g => g.id === r.id))
      .filter((g): g is Game => g !== undefined)
      .slice(0, 4);
  }, [recents]);

  return (
    <div className="min-h-screen bg-[#111111] text-neutral-100 flex flex-col font-sans selection:bg-[var(--accent)] selection:text-black">
      {/* Skip to main content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-black focus:font-mono focus:font-bold focus:rounded"
      >
        Skip to main content
      </a>

      {/* Compact Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={favourites.length}
        onOpenSearch={() => setIsSearchOpen(true)}
        settings={settings}
        onUpdateSettings={updateSettings}
        searchTriggerRef={searchTriggerRef}
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col gap-8">
        {/* Featured hero — real rendered key art, editable from the Control Center */}
        {config.hero.enabled && featuredGame && (
        <section className="relative overflow-hidden rounded-xl border-2 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] min-h-[250px] sm:min-h-[300px] flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.hero.image || featuredGame.art?.bannerImage || featuredGame.art?.cardImage || ''}
            alt={`${config.hero.headline} key art`}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" aria-hidden="true" />

          <div className="relative z-10 flex flex-col justify-center gap-3 p-6 sm:p-10 max-w-xl">
            {config.hero.badge && (
              <span className="w-fit px-2 py-0.5 bg-[var(--accent)] text-black font-mono text-[10px] font-bold rounded tracking-wider uppercase shadow-xs">
                {config.hero.badge}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-neutral-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {config.hero.headline}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-neutral-300 max-w-md leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
              {config.hero.subtext}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={playFeaturedNow}
                className="px-5 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono text-xs font-bold rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                {config.hero.cta}
              </button>
              <button
                onClick={() => setSelectedGame(featuredGame)}
                className="px-4 py-2.5 bg-neutral-900/85 border border-neutral-600 text-neutral-200 font-mono text-xs rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {config.hero.secondaryCta}
              </button>
            </div>
          </div>
        </section>
        )}

        {/* Recently Played Section (Renders ONLY when real local history exists) */}
        {config.flags.showRecents && recentGames.length > 0 && activeTab === 'all' && !searchQuery && selectedCategory === 'All' && (
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[color:var(--accent)]" /> Recently Played
              </h2>
              <button
                onClick={handleClearRecents}
                className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear history
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentGames.map(game => (
                <div
                  key={`recent-${game.id}`}
                  onClick={() => setSelectedGame(game)}
                  className="flex items-center gap-3 p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-neutral-950 border border-neutral-800">
                    <GameArt game={game} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate text-neutral-200">{game.title}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{game.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Discovery Controls */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className={`${config.flags.showCategories ? 'flex' : 'hidden'} items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none font-mono text-xs`}>
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-lg border shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[var(--accent)] text-black font-bold border-[var(--accent)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[var(--accent)] text-black font-bold border-[var(--accent)]'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input & Sort dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter titles or tags..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[var(--accent)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                aria-label="Sort games by"
              >
                <option value="featured">Sort: Featured</option>
                <option value="az">Sort: A–Z</option>
                <option value="recent">Sort: Recently Played</option>
              </select>
            </div>
          </div>

          {/* Filter count & active filter summary */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-500 pt-1">
            <span>
              Showing {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
              {activeTab === 'saved' && ' in Saved'}
            </span>
            {(searchQuery || selectedCategory !== 'All' || activeTab === 'saved') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setActiveTab('all');
                }}
                className="text-[color:var(--accent)] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </section>

        {/* Game Library Grid */}
        {filteredGames.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-800 rounded-xl p-8">
            <p className="font-mono text-sm text-neutral-400">No games found matching your filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setActiveTab('all');
              }}
              className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredGames.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                isFavourite={favourites.includes(game.id)}
                onToggleFavourite={toggleFavourite}
                onSelectGame={(g) => {
                  setClickedCardRef(document.activeElement as HTMLElement);
                  setSelectedGame(g);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Minimal Functional Footer */}
      {config.flags.showFooter && (
      <footer className="border-t border-neutral-850 mt-12 py-6 px-4 sm:px-8 text-center text-xs font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>DueNever © {new Date().getFullYear()} — {config.site.footerText}</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Low-spec friendly</span>
            <span>•</span>
            <span>No installs</span>
            <span>•</span>
            <span>Local data only</span>
          </div>
        </div>
      </footer>
      )}

      {/* Game Details Modal / Sheet */}
      <GameDetailModal
        game={selectedGame}
        onClose={() => {
          setSelectedGame(null);
          setAutoLaunch(false);
        }}
        isFavourite={selectedGame ? favourites.includes(selectedGame.id) : false}
        onToggleFavourite={toggleFavourite}
        onGameLaunched={handleGameLaunched}
        triggerRef={clickedCardRef}
        autoLaunch={autoLaunch}
      />

      {/* Command Menu (Ctrl+K) */}
      <CommandMenu
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        games={games}
        onSelectGame={g => setSelectedGame(g)}
        onSelectCategory={cat => setSelectedCategory(cat as GameCategory)}
        onShowSaved={() => setActiveTab('saved')}
        onClearFilters={() => {
          setSearchQuery('');
          setSelectedCategory('All');
          setActiveTab('all');
        }}
        triggerRef={searchTriggerRef.current}
      />

      {/* Undo Toast Notifications */}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
