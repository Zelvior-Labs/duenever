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
  {
    id: 'rune-bastion',
    title: 'Rune Bastion',
    slug: 'rune-bastion',
    tagline: 'Hold the rune bastion against goblin hordes, golems and dragons.',
    description:
      'Fantasy tower defense on a torch-lit stone causeway. Build Arcane Spires, Ranger Posts and Frost Keeps on rune pads, upgrade them through three levels, and call waves early for bonus gold. Goblins swarm, stone golems shrug off arrows, and a dragon boss arrives every eighth wave. If the runes fall, the realm falls.',
    category: 'Strategy' as GameCategory,
    tags: ['Tower Defense', 'Fantasy', 'Waves', 'Single Player'],
    controls: [
      '1 / 2 / 3 pick tower · click a rune pad to build',
      'Click a tower to upgrade (U) or sell (S)',
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
