import { Chess, type Square } from 'chess.js';
/** Replay legal history so captures, including en passant and promotions, are accurate. */
export function chessInsights(moves: string[]): { last: { from: Square; to: Square } | null; whiteCaptures: string[]; blackCaptures: string[] } {
  const chess = new Chess(), whiteCaptures: string[] = [], blackCaptures: string[] = [];
  let last: { from: Square; to: Square } | null = null;
  for (const san of moves) {
    const move = chess.move(san);
    if (move.captured) (move.color === 'w' ? whiteCaptures : blackCaptures).push(move.captured);
    last = { from: move.from, to: move.to };
  }
  return { last, whiteCaptures, blackCaptures };
}
