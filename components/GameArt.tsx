import React from 'react';
import { Game } from '@/lib/games';

interface GameArtProps {
  game: Game;
  className?: string;
}

export function GameArt({ game, className = '' }: GameArtProps) {
  const { accentColor, bgPattern, artSeed, title, category } = game;

  // Generate deterministic shapes based on seed & pattern
  const p1 = (artSeed * 17) % 100;
  const p2 = (artSeed * 31) % 100;
  const p3 = (artSeed * 47) % 100;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-neutral-900 flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {/* Background patterns */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${artSeed}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
          </pattern>
          <pattern id={`dots-${artSeed}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" fill="#FFFFFF" />
          </pattern>
          <pattern id={`stripes-${artSeed}`} width="20" height="20" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#FFFFFF" strokeWidth="2" />
          </pattern>
        </defs>
        {bgPattern === 'grid' && <rect width="100%" height="100%" fill={`url(#grid-${artSeed})`} />}
        {bgPattern === 'dots' && <rect width="100%" height="100%" fill={`url(#dots-${artSeed})`} />}
        {bgPattern === 'stripes' && <rect width="100%" height="100%" fill={`url(#stripes-${artSeed})`} />}
        {bgPattern === 'rings' && (
          <g stroke="#FFFFFF" strokeWidth="1" fill="none">
            <circle cx="50%" cy="50%" r="20%" />
            <circle cx="50%" cy="50%" r="35%" />
            <circle cx="50%" cy="50%" r="48%" />
          </g>
        )}
        {bgPattern === 'waves' && (
          <path d="M 0 20 Q 50 0 100 20 T 200 20" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        )}
        {bgPattern === 'iso' && (
          <g stroke="#FFFFFF" strokeWidth="1" fill="none">
            <path d="M 0 0 L 100 100 M 0 50 L 100 150 M 50 0 L 150 100" />
          </g>
        )}
      </svg>

      {/* Main Art Motifs per game category / seed */}
      <svg className="relative w-4/5 h-4/5 max-w-[200px] max-h-[140px]" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Category specific dynamic vector composition */}
        {category === 'Reflex' && (
          <g>
            <circle cx="100" cy="70" r="45" stroke={accentColor} strokeWidth="6" strokeDasharray="12 6" />
            <polygon points="100,35 125,85 75,85" fill={accentColor} />
            <circle cx="100" cy="70" r="10" fill="#FFFFFF" />
            <path d="M 30 70 L 60 70 M 140 70 L 170 70" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {category === 'Puzzle' && (
          <g>
            <rect x="35" y="25" width="40" height="40" rx="4" fill={accentColor} />
            <rect x="85" y="25" width="40" height="40" rx="4" fill="#FFFFFF" opacity="0.9" />
            <rect x="135" y="25" width="30" height="40" rx="4" fill="#555555" />
            <rect x="35" y="75" width="90" height="40" rx="4" fill="#222222" stroke={accentColor} strokeWidth="3" />
            <rect x="135" y="75" width="30" height="40" rx="4" fill={accentColor} />
          </g>
        )}

        {category === 'Chill' && (
          <g>
            <circle cx="100" cy="70" r="50" fill={accentColor} opacity="0.15" />
            <path d="M 40 85 Q 70 45 100 85 T 160 85" stroke={accentColor} strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="70" cy="55" r="14" fill="#FFFFFF" opacity="0.8" />
            <circle cx="130" cy="65" r="8" fill={accentColor} />
          </g>
        )}

        {category === 'Two-player' && (
          <g>
            <rect x="25" y="35" width="65" height="70" rx="8" fill="#222222" stroke="#FFFFFF" strokeWidth="3" />
            <rect x="110" y="35" width="65" height="70" rx="8" fill="#222222" stroke={accentColor} strokeWidth="3" />
            <circle cx="57" cy="70" r="16" fill="#FFFFFF" />
            <circle cx="142" cy="70" r="16" fill={accentColor} />
            <path d="M 50 70 L 64 70 M 57 63 L 57 77" stroke="#000" strokeWidth="3" />
            <polygon points="142,60 152,77 132,77" fill="#000" />
          </g>
        )}

        {category === 'Quick' && (
          <g>
            <rect x="30" y="30" width="140" height="80" rx="6" fill="#181818" stroke="#444444" strokeWidth="2" />
            <line x1="30" y1="55" x2="170" y2="55" stroke="#333333" strokeWidth="2" />
            <circle cx="50" cy="42" r="4" fill="#FF5555" />
            <circle cx="62" cy="42" r="4" fill="#FFCC00" />
            <circle cx="74" cy="42" r="4" fill="#00CC55" />
            <rect x="50" y="70" width="50" height="24" rx="3" fill={accentColor} />
            <rect x="110" y="70" width="40" height="24" rx="3" fill="#FFFFFF" opacity="0.9" />
          </g>
        )}
      </svg>

      {/* Decorative badge tag */}
      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-black/80 text-neutral-300 rounded border border-neutral-700">
        {category}
      </span>
    </div>
  );
}
