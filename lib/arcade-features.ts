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
