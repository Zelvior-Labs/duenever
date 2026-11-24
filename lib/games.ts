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
  playerCounts?: number[];
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
    playerCounts: [1],
    id: 'rocket-rampage',
    title: 'Rocket Rampage',
    slug: 'rocket-rampage',
    tagline: 'Shred asteroids and outgun alien fighters in deep space.',
    description:
      'Pilot the VF-X Rocket through asteroid formations and smarter fighters. Collect repair kits, shields, weapons and EMP charges that clear hostile shots; build score multipliers with quick takedowns. Waves escalate until you break. Three lives, one high score.',
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
    playerCounts: [1],
    id: 'rune-bastion',
    title: 'Rune Bastion',
    slug: 'rune-bastion',
    tagline: 'Hold the rune bastion against goblin hordes, golems and dragons.',
    description:
      'Defend the causeway with Arcane Spires, Ranger Posts, Frost Keeps and chain-lightning Storm Obelisks. Set tower targets, choose power or speed mastery, earn flawless bonuses, repair between waves and unleash a frost pulse. Wolves rush, shamans heal their allies, and dragons attack every eighth wave. Swift and armored waves change the challenge; upgrade towers and call waves early for bonus gold.',
    category: 'Strategy' as GameCategory,
    tags: ['Tower Defense', 'Fantasy', 'Waves', 'Single Player'],
    controls: [
      'Pick a tower, then tap or click a rune pad to build · 1 / 2 / 3 / 4 also select',
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
  {
    playerCounts: [1],
    id: 'treasure-drift',
    title: 'Treasure Drift',
    slug: 'treasure-drift',
    tagline: 'Sail the reef and collect a fortune.',
    description: 'Steer a tiny ship through treacherous reefs, collect gold and treasure chests, build a life-restoring streak and complete voyage goals for bonus points. The longer you survive, the faster the sea becomes. Three lives, one daring voyage.',
    category: 'Reflex',
    tags: ['Arcade', 'Adventure', 'High Score', 'Single Player'],
    controls: ['Drag or tap to steer · Arrow keys / A D', 'Collect gold and avoid rocks', 'P or Escape to pause'],
    playable: true,
    accentColor: '#28C6C1',
    art: { cardImage: '/games/treasure-drift/banner.jpg', bannerImage: '/games/treasure-drift/banner.jpg' },
  },
  {
    id: 'skyline-sprint', title: 'Skyline Sprint', slug: 'skyline-sprint', category: 'Reflex', playerCounts: [1],
    tagline: 'Jump, slide and race across the neon skyline.',
    description: 'Keep your courier moving through an endless rooftop run. Jump over cargo, slide under drones and collect energy cells, shields and rocket shoes for an extra air jump, and build clean-clear bonuses as the pace rises. Three hits, one high score.',
    tags: ['Endless Runner', 'Arcade', 'High Score', 'Single Player'], controls: ['Space / W / ↑ or tap Jump to leap', 'Hold S / ↓ or Slide to duck · P to pause'], playable: true, accentColor: '#6EE7F2', art: { cardImage: '/games/skyline-sprint/banner.jpg', bannerImage: '/games/skyline-sprint/banner.jpg' },
  },
  {
    id: 'circuit-merge', title: 'Circuit Merge', slug: 'circuit-merge', category: 'Puzzle', playerCounts: [1],
    tagline: 'Merge matching tiles and power up your grid.',
    description: 'Slide matching tiles together to reach 2048, then keep going. Think ahead, undo up to three moves and use hints, or try the seeded daily circuit.',
    tags: ['Puzzle', 'Strategy', 'High Score', 'Single Player'], controls: ['Swipe, use the arrow keys / WASD, or tap the direction buttons', 'Combine equal tiles · undo your last move'], playable: true, accentColor: '#CCFF00', art: { cardImage: '/games/circuit-merge/banner.jpg', bannerImage: '/games/circuit-merge/banner.jpg' },
  },
  {
    id: 'ludo', title: 'Ludo', slug: 'ludo', category: 'Strategy', playerCounts: [1, 2, 4],
    tagline: 'Race your pieces home with friends or bots.',
    description: 'Play the classic race game with private friend rooms or bots. Roll six to enter, capture opponents and bring all four tokens home. Review token progress, legal move outcomes and potential exposure.',
    tags: ['Board Game', 'Multiplayer', 'Bots'], controls: ['Roll the dice, then tap a token', 'Exact roll to finish · six earns another turn'], playable: true, accentColor: '#F6C856', art: { cardImage: '/games/ludo/banner.jpg', bannerImage: '/games/ludo/banner.jpg' },
  },
  {
    id: 'chess', title: 'Chess', slug: 'chess', category: 'Strategy', playerCounts: [1, 2],
    tagline: 'Challenge a friend or a computer opponent.',
    description: 'Play chess in a private room or against a bot. Legal moves, checkmate, castling, en passant and promotion, with a flip board, captured pieces and a read-only move review.',
    tags: ['Board Game', 'Multiplayer', 'Bots'], controls: ['Select a piece and destination', 'Choose a piece when promoting'], playable: true, accentColor: '#D0C0A0', art: { cardImage: '/games/chess/banner.jpg', bannerImage: '/games/chess/banner.jpg' },
  },
];
