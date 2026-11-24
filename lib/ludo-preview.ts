import { legalLudo, type BoardState } from './board-games';
const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
/** Describe a legal move without executing it or revealing any hidden information. */
export function ludoMovePreview(board: BoardState, token: number): string | null {
  if (board.die === null || !legalLudo(board).includes(token)) return null;
  const player = board.turn, current = board.ludo[player][token];
  const next = current === -1 ? 0 : current + board.die;
  if (next === 57) return 'Finish';
  if (next >= 52) return 'Home lane';
  const pos = (next + player * 13) % 52;
  if (safe.has(pos)) return current === -1 ? 'Enter on safe square' : 'Safe square';
  const captures = board.ludo.reduce((total, pieces, seat) => total + (seat === player ? 0 : pieces.filter(p => p >= 0 && p < 52 && (p + seat * 13) % 52 === pos).length), 0);
  return captures ? `Capture ${captures}` : 'Advance';
}

export function ludoTokenStatus(progress: number): string {
  if (progress < 0) return 'At base · roll six to enter';
  if (progress >= 57) return 'Home';
  return `${57 - progress} steps from home${progress >= 52 ? ' · home lane' : ''}`;
}

/** Potential exposure on a future opponent roll; not a prediction of turn order or dice. */
export function ludoMoveExposure(board: BoardState, token: number): number {
  if (board.die === null || !legalLudo(board).includes(token)) return 0;
  const player = board.turn, current = board.ludo[player][token];
  const next = current === -1 ? 0 : current + board.die;
  if (next >= 52) return 0;
  const position = (next + player * 13) % 52;
  if (safe.has(position)) return 0;
  return board.ludo.reduce((count, pieces, seat) => {
    if (seat === player) return count;
    return count + pieces.filter(progress => {
      if (progress < 0 || progress >= 52) return false;
      const steps = (position - (progress + seat * 13) + 52) % 52;
      return steps >= 1 && steps <= 6 && progress + steps < 52;
    }).length;
  }, 0);
}
