/** Consecutive eliminations within four seconds build a capped score multiplier. */
export function rocketCombo(streak: number, remaining: number, baseScore: number) {
  const next = remaining > 0 ? streak + 1 : 1;
  const multiplier = Math.min(4, 1 + Math.floor((next - 1) / 5));
  return { streak: next, remaining: 4, multiplier, points: baseScore * multiplier };
}
export function treasureReward(kind: 'coin' | 'chest', streak: number, lives: number) {
  if (kind === 'chest') return { score: 100, streak, lives };
  const next = streak + 1;
  return { score: 10 + Math.min(40, (next - 1) * 2), streak: next, lives: next % 10 === 0 ? Math.min(3, lives + 1) : lives };
}

/** EMP removes hostile fire but never friendly shots. Returns the cleared count. */
export function clearHostileFire<T extends { friendly: boolean; dead: boolean }>(bolts: T[]): number {
  let count = 0;
  for (const bolt of bolts) if (!bolt.friendly && !bolt.dead) { bolt.dead = true; count++; }
  return count;
}

export type VoyageClaims = { coins: boolean; chests: boolean; survival: boolean };
/** Three independent goals per voyage; each reward may be claimed only once. */
export function voyageMissions(claims: VoyageClaims, coins: number, chests: number, seconds: number) {
  const next = { ...claims }; let reward = 0;
  if (!next.coins && coins >= 12) { next.coins = true; reward += 150; }
  if (!next.chests && chests >= 2) { next.chests = true; reward += 200; }
  if (!next.survival && seconds >= 45) { next.survival = true; reward += 150; }
  return { claims: next, reward };
}
