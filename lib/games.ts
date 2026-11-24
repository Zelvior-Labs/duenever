export type GameCategory = 'Quick' | 'Puzzle' | 'Reflex' | 'Chill' | 'Two-player' | 'Strategy';

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

export const CATEGORIES: GameCategory[] = ['Quick', 'Puzzle', 'Reflex', 'Chill', 'Two-player', 'Strategy'];

export const GAMES: Game[] = [
  {
    id: 'rocket-rampage',
    title: 'Rocket Rampage',
    slug: 'rocket-rampage',
    tagline: 'Shred asteroids and outgun alien fighters in deep space.',
    description:
      'Pilot the VF-X Rocket through asteroid formations and smarter fighters. Collect repair kits, rapid-fire and spread-fire upgrades, and watch for gold-ringed elite enemies. Waves escalate until you break. Three lives, one high score.',
    category: 'Reflex',
    tags: ['Arcade', 'Shooter', 'High Score', 'Single Player'],
    controls: [
      'Mouse / touch or WASD / Arrows to steer',
      'Cannons auto-fire · Space / burst button = spread burst',
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
  {
    id: 'rune-bastion',
    title: 'Rune Bastion',
    slug: 'rune-bastion',
    tagline: 'Hold the rune bastion against goblin hordes, golems and dragons.',
    description:
      'Defend the causeway with Arcane Spires, Ranger Posts and Frost Keeps. Wolves rush, shamans heal their allies, and dragons attack every eighth wave. Swift and armored waves change the challenge; upgrade towers and call waves early for bonus gold.',
    category: 'Strategy' as GameCategory,
    tags: ['Tower Defense', 'Fantasy', 'Waves', 'Single Player'],
    controls: [
      'Pick a tower, then tap or click a rune pad to build · 1 / 2 / 3 also select',
      'Tap or click a tower to upgrade or sell · U / S on keyboard',
      'Space / N calls the next wave early for bonus gold · P pause',
    ],
    playable: true,
    accentColor: '#C09AFF',
    art: {
      cardImage: '/games/rune-bastion/banner.jpg',
      bannerImage: '/games/rune-bastion/banner.jpg',
    },
  },
];
