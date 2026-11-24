export type Direction = 'up' | 'down' | 'left' | 'right';
export type Grid = number[];
export const GRID_SIZE = 4;

export function addTile(grid: Grid, random = Math.random): Grid {
  const empty = grid.flatMap((value, i) => value === 0 ? [i] : []);
  if (!empty.length) return grid.slice();
  const next = grid.slice();
  const index = Math.min(empty.length - 1, Math.floor(random() * empty.length));
  next[empty[index]] = random() < 0.9 ? 2 : 4;
  return next;
}
export function newGrid(random = Math.random): Grid { return addTile(addTile(Array(16).fill(0), random), random); }

export function slide(grid: Grid, direction: Direction): { grid: Grid; score: number; changed: boolean } {
  const result = grid.slice(); let score = 0;
  for (let line = 0; line < GRID_SIZE; line++) {
    const positions = Array.from({ length: GRID_SIZE }, (_, i) => {
      if (direction === 'left') return line * 4 + i;
      if (direction === 'right') return line * 4 + (3 - i);
      if (direction === 'up') return i * 4 + line;
      return (3 - i) * 4 + line;
    });
    const values = positions.map(i => grid[i]).filter(Boolean), merged: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) { const value = values[i] * 2; merged.push(value); score += value; i++; }
      else merged.push(values[i]);
    }
    positions.forEach((index, i) => { result[index] = merged[i] || 0; });
  }
  return { grid: result, score, changed: result.some((value, i) => value !== grid[i]) };
}
export function canMove(grid: Grid): boolean {
  return grid.some((v, i) => v === 0 || (i % 4 < 3 && v === grid[i + 1]) || (i < 12 && v === grid[i + 4]));
}
