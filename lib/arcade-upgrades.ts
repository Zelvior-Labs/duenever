/** A shield absorbs one hit. Invulnerability is handled separately by each game. */
export function absorbHit(lives: number, shield: boolean): { lives: number; shield: boolean } {
  return shield ? { lives, shield: false } : { lives: Math.max(0, lives - 1), shield: false };
}
export type RocketDrop = 'repair' | 'rapid' | 'spread' | 'shield';
export function chooseRocketDrop(random = Math.random): RocketDrop {
  const n = random();
  return n < .25 ? 'repair' : n < .5 ? 'rapid' : n < .75 ? 'spread' : 'shield';
}
export function attractTreasure(x: number, target: number, elapsed: number, active: boolean): number {
  return active ? x + (target - x) * (1 - Math.exp(-3.2 * Math.max(0, elapsed))) : x;
}
export function canUsePulse(cooldown: number, playing: boolean, enemyCount: number): boolean {
  return playing && cooldown <= 0 && enemyCount > 0;
}
