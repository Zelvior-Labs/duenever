'use client';

import React, { useState } from 'react';
import { Search, Settings as SettingsIcon } from 'lucide-react';
import { Settings } from '@/lib/storage';
import { BrandMark } from './BrandMark';

interface HeaderProps {
  activeTab: 'all' | 'saved';
  setActiveTab: (tab: 'all' | 'saved') => void;
  savedCount: number;
  onOpenSearch: () => void;
  settings: Settings;
  onUpdateSettings: (s: Settings) => void;
  searchTriggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function Header({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenSearch,
  settings,
  onUpdateSettings,
  searchTriggerRef,
}: HeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b-2 border-neutral-800 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark with elastic hover / press interaction */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('all');
            }}
            className="group relative flex items-center select-none"
            aria-label="DueNever homepage"
          >
            <BrandMark className="w-9 h-7 sm:w-10 sm:h-8 mr-0 sm:mr-2 group-hover:scale-105 transition-transform" />
            <span className="hidden sm:inline-block font-mono text-xl sm:text-2xl font-black tracking-tight text-neutral-100 group-hover:scale-105 group-active:scale-95 transition-transform duration-150 origin-left">
              Due<span className="text-[color:var(--accent)]">Never</span>
            </span>
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 hidden sm:inline-block">
              web
            </span>
          </a>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-neutral-800 text-[color:var(--accent)] font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All games
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-neutral-800 text-[color:var(--accent)] font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-[var(--accent)] text-black font-bold rounded-full">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right side controls: Search Trigger + Preferences dropdown */}
        <div className="flex items-center gap-2">
          <button
            ref={searchTriggerRef}
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            aria-label="Search games (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Preference Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
              aria-label="Performance and Motion Settings"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4 text-neutral-400 group-hover:text-neutral-200" />
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border-2 border-neutral-700 rounded-lg shadow-xl p-3 z-50 font-mono text-xs text-neutral-200 space-y-3">
                <div className="font-bold border-b border-neutral-800 pb-1 text-neutral-400 uppercase text-[10px]">
                  Display & Hardware
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span>Reduced Motion</span>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => onUpdateSettings({ ...settings, reducedMotion: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span>Low CPU Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.lowPerformance}
                    onChange={(e) => onUpdateSettings({ ...settings, lowPerformance: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                </label>

                <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
                  Optimized for budget laptops & low-end browsers.
                </div>

                <a
                  href="/control-center"
                  className="flex items-center justify-between pt-2 border-t border-neutral-800 text-neutral-300 hover:text-[color:var(--accent)] transition-colors cursor-pointer font-bold"
                >
                  <span>Control Center</span>
                  <span className="text-[9px] font-normal text-neutral-500">admin</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
