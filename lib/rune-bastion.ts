export type TargetMode = 'first' | 'last' | 'strongest';
export type Targetable = { x: number; y: number; hp: number; prog: number };
export function selectTarget<T extends Targetable>(enemies: T[], x: number, y: number, range: number, mode: TargetMode): T | null {
  let best: T | null = null;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || Math.hypot(enemy.x - x, enemy.y - y) > range) continue;
    if (!best || (mode === 'first' ? enemy.prog > best.prog : mode === 'last' ? enemy.prog < best.prog : enemy.hp > best.hp)) best = enemy;
  }
  return best;
}
/** A chain jumps to the nearest distinct living enemy within radius at each step. */
export function chainTargets<T extends Targetable>(first: T, enemies: T[], radius: number, limit: number): T[] {
  if (first.hp <= 0 || limit <= 0) return [];
  const result = [first];
  while (result.length < limit) {
    const last = result[result.length - 1];
    let nearest: T | null = null, distance = radius;
    for (const e of enemies) {
      if (e.hp <= 0 || result.includes(e)) continue;
      const d = Math.hypot(e.x - last.x, e.y - last.y);
      if (d <= distance) { nearest = e; distance = d; }
    }
    if (!nearest) break;
    result.push(nearest);
  }
  return result;
}
export const REPAIR_COST = 45;
export function repairBastion(gold: number, lives: number, phase: 'build' | 'combat', playing: boolean) {
  if (!playing || phase !== 'build' || gold < REPAIR_COST || lives >= 20 || lives <= 0) return null;
  return { gold: gold - REPAIR_COST, lives: Math.min(20, lives + 3) };
}
export function waveLabel(wave: number): string {
  return wave % 8 === 0 ? 'Dragon boss' : wave % 4 === 2 ? 'Swift enemies' : wave % 4 === 3 ? 'Armored enemies' : 'Standard wave';
}

export type Mastery = 'power' | 'speed';
export const MASTERY_COST = 65;
export function chooseMastery(gold: number, level: number, mastery: Mastery | null, playing: boolean, choice: Mastery) {
  if (!playing || level < 2 || mastery !== null || gold < MASTERY_COST) return null;
  return { gold: gold - MASTERY_COST, mastery: choice };
}
export function masteryStats(damage: number, rate: number, mastery: Mastery | null) {
  return { damage: damage * (mastery === 'power' ? 1.35 : 1), rate: rate * (mastery === 'speed' ? .75 : 1) };
}
export function waveClearBonus(wave: number, leaks: number) {
  return { base: 20 + wave * 4, flawless: leaks === 0 ? 15 + wave * 3 : 0 };
}
