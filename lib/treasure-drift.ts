import { treasureReward, voyageMissions, type VoyageClaims } from './arcade-features';
import { attractTreasure } from './arcade-upgrades';

export type SeaItem = { id: number; kind: 'rock' | 'coin' | 'magnet' | 'chest'; x: number; y: number };
export type Sea = { x: number; y: number; targetX: number; targetY: number; items: SeaItem[]; score: number; lives: number; time: number; spawn: number; coins: number; inv: number; magnet: number; totalCoins: number; chests: number; missions: VoyageClaims; id: number };
export type SeaInput = { x: number; y: number };
export type SeaViewport = { width: number; height: number };
export type SeaEvent = 'collect' | 'hit' | 'mission';
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const newSea = (): Sea => ({ x: 50, y: 80, targetX: 50, targetY: 80, items: [], score: 0, lives: 3, time: 0, spawn: .4, coins: 0, inv: 0, magnet: 0, totalCoins: 0, chests: 0, missions: { coins: false, chests: false, survival: false }, id: 0 });

/** Bounds keep the ship and its hitbox inside the playable ocean, below the HUD. */
export function seaBounds(view: SeaViewport) {
  const width = Math.max(1, view.width), height = Math.max(1, view.height);
  const shipWidth = clamp(width * .08, 44, 80), shipHeight = clamp(height * .15, 70, 120);
  const x = Math.min(45, (shipWidth / 2 + 3) / width * 100);
  const y = Math.min(30, (shipHeight / 2 + 3) / height * 100);
  return { minX: x, maxX: 100 - x, minY: Math.min(50, Math.max(17, (68 + shipHeight / 2) / height * 100)), maxY: 100 - y };
}
export function seaTarget(view: SeaViewport, x: number, y: number) {
  const b = seaBounds(view);
  // Very short viewports can have less room between the header and bottom edge.
  return { x: clamp(x, b.minX, b.maxX), y: clamp(y, Math.min(b.minY, b.maxY), b.maxY) };
}

/** Collision uses screen-space elliptical hitboxes derived from the visible sprite sizes. */
export function seaCollision(ship: Pick<Sea, 'x' | 'y'>, item: SeaItem, view: SeaViewport): boolean {
  const w = Math.max(1, view.width), h = Math.max(1, view.height);
  const shipW = clamp(w * .08, 44, 80), shipH = clamp(h * .15, 70, 120);
  const itemSize = item.kind === 'rock' ? clamp(w * .09, 40, 90) : clamp(w * .06, 28, 58);
  const dx = (item.x - ship.x) * w / 100 / (shipW * .32 + itemSize * .32);
  const dy = (item.y - ship.y) * h / 100 / (shipH * .33 + itemSize * .32);
  return dx * dx + dy * dy < 1;
}

/** Advance one bounded frame. Randomness and viewport are injectable for deterministic tests. */
export function stepSea(input: Sea, elapsed: number, movement: SeaInput, view: SeaViewport, random = Math.random): { sea: Sea; events: SeaEvent[] } {
  const dt = clamp(elapsed, 0, .05), w: Sea = { ...input, items: input.items.map(item => ({ ...item })) };
  const events: SeaEvent[] = [];
  w.time += dt; w.magnet = Math.max(0, w.magnet - dt); w.inv = Math.max(0, w.inv - dt);
  const length = Math.hypot(movement.x, movement.y);
  if (length) {
    // Keyboard overrides any previous pointer destination; diagonal travel is not faster.
    const target = seaTarget(view, w.x + movement.x / length * 320 * dt / Math.max(1, view.width) * 100, w.y + movement.y / length * 320 * dt / Math.max(1, view.height) * 100);
    w.x = w.targetX = target.x; w.y = w.targetY = target.y;
  } else {
    const target = seaTarget(view, w.targetX, w.targetY);
    w.targetX = target.x; w.targetY = target.y;
    const dx = (target.x - w.x) * view.width / 100, dy = (target.y - w.y) * view.height / 100;
    const distance = Math.hypot(dx, dy), amount = distance ? Math.min(1, 360 * dt / distance) : 0;
    w.x += (target.x - w.x) * amount; w.y += (target.y - w.y) * amount;
    const bounded = seaTarget(view, w.x, w.y); w.x = bounded.x; w.y = bounded.y;
  }
  w.spawn -= dt;
  if (w.spawn <= 0) {
    const x = 10 + random() * 80, roll = random();
    w.items.push({ id: ++w.id, kind: roll < .06 ? 'chest' : roll < .14 ? 'magnet' : roll < .54 ? 'coin' : 'rock', x, y: -12 });
    w.spawn = Math.max(.48, .95 - w.time / 170);
  }
  const speed = Math.min(45, 22 + w.time * .16);
  for (const item of w.items) {
    item.y += speed * dt;
    if (item.kind === 'coin' && w.magnet > 0 && Math.abs(item.y - w.y) < 35) item.x = attractTreasure(item.x, w.x, dt, true);
    if (!seaCollision(w, item, view)) continue;
    item.y = 120;
    if (item.kind === 'coin' || item.kind === 'chest') {
      events.push('collect'); if (item.kind === 'coin') w.totalCoins++; else w.chests++;
      const reward = treasureReward(item.kind, w.coins, w.lives);
      w.coins = reward.streak; w.score += reward.score; w.lives = reward.lives;
    } else if (item.kind === 'magnet') { events.push('collect'); w.magnet = 8; }
    else if (!w.inv) { events.push('hit'); w.lives--; w.coins = 0; w.inv = 2; }
  }
  w.items = w.items.filter(item => item.y < 110);
  const mission = voyageMissions(w.missions, w.totalCoins, w.chests, w.time);
  if (mission.reward) { w.score += mission.reward; w.missions = mission.claims; events.push('mission'); }
  return { sea: w, events };
}
