export type GameCategory = 'Quick' | 'Puzzle' | 'Reflex' | 'Chill' | 'Two-player';

export interface GameArtAssets {
  /** Rendered on catalogue cards */
  cardImage: string;
  /** Rendered as the wide banner in the detail modal / hero */
  bannerImage?: string;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: GameCategory;
  tags: string[];
  controls: string[];
  featured?: boolean;
  playable?: boolean;
  accentColor: string;
  /** Real rendered art assets — when present, components render these images */
  art?: GameArtAssets;
  // Legacy procedural-art knobs (only used when `art` is absent)
  bgPattern?: 'grid' | 'dots' | 'stripes' | 'rings' | 'waves' | 'iso';
  artSeed?: number;
}

export const CATEGORIES: GameCategory[] = ['Quick', 'Puzzle', 'Reflex', 'Chill', 'Two-player'];

export const GAMES: Game[] = [
  {
    id: 'rocket-rampage',
    title: 'Rocket Rampage',
    slug: 'rocket-rampage',
    tagline: 'Shred asteroids and outgun alien fighters in deep space.',
    description:
      'Full-throttle arcade space shooter. Pilot the VF-X Rocket through a hostile asteroid belt — twin auto-cannons shred rocks (large ones split!), alien fighters dive in with aimed return fire, and rare repair kits keep you alive. Waves escalate until you break. Three lives, one high score.',
    category: 'Reflex',
    tags: ['Arcade', 'Shooter', 'High Score', 'Single Player'],
    controls: [
      'Mouse / touch or WASD / Arrows to steer',
      'Cannons auto-fire · Space / tap = spread burst',
      'P or Esc to pause',
    ],
    featured: true,
    playable: true,
    accentColor: '#CCFF00',
    art: {
      cardImage: '/games/rocket-rampage/banner.jpg',
      bannerImage: '/games/rocket-rampage/banner.jpg',
    },
  },
];
