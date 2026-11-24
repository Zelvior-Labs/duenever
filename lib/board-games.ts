import { Chess, type Square } from 'chess.js';

export type BoardGame = 'chess' | 'ludo';
export type BoardState = {
  game: BoardGame; seats: ('human' | 'bot')[]; turn: number; finished: boolean; result: string;
  chessMoves: string[]; drawOffer: number | null; ludo: number[][]; die: number | null; lastRoll: number | null;
};
export type BoardAction = { type: 'move'; from?: string; to?: string; promotion?: string; token?: number } | { type: 'roll' } | { type: 'resign' } | { type: 'claim-draw'; from?: string; to?: string; promotion?: string } | { type: 'offer-draw' } | { type: 'accept-draw' };

export function newBoard(game: BoardGame, seats: ('human' | 'bot')[]): BoardState {
  return { game, seats, turn: 0, finished: false, result: '', chessMoves: [], drawOffer: null, ludo: seats.map(() => [-1, -1, -1, -1]), die: null, lastRoll: null };
}
export function chessPosition(moves: string[]) { const chess = new Chess(); for (const san of moves) chess.move(san); return chess; }
export function legalLudo(state: BoardState): number[] {
  if (state.die === null) return [];
  return state.ludo[state.turn].flatMap((p, i) => (p === -1 ? state.die === 6 : p < 57 && p + state.die! <= 57) ? [i] : []);
}
const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export function boardAction(input: BoardState, seat: number, action: BoardAction, roll: () => number): BoardState {
  const s = structuredClone(input);
  if (s.finished || !s.seats[seat]) throw new Error('Game is over');
  if (action.type === 'resign') { s.finished = true; s.result = `Player ${seat + 1} resigned`; return s; }
  if (s.game === 'chess' && action.type === 'accept-draw') {
    if (s.drawOffer === null || s.drawOffer === seat) throw new Error('No draw offer to accept');
    s.finished = true; s.result = 'Draw by agreement'; return s;
  }
  if (s.turn !== seat) throw new Error('Not your turn');
  if (s.game === 'chess' && action.type === 'offer-draw') { s.drawOffer = seat; return s; }
  if (s.game === 'chess') {
    const chess = chessPosition(s.chessMoves);
    if (action.type === 'claim-draw') {
      if (action.from && action.to) {
        try { chess.move({ from: action.from as Square, to: action.to as Square, promotion: action.promotion || 'q' }); }
        catch { throw new Error('Illegal intended move'); }
      }
      if (!chess.isThreefoldRepetition() && !chess.isDrawByFiftyMoves()) throw new Error('No draw can be claimed');
      s.finished = true; s.result = 'Draw claimed'; return s;
    }
    if (action.type !== 'move' || typeof action.from !== 'string' || typeof action.to !== 'string') throw new Error('Choose a move');
    try { const m = chess.move({ from: action.from as Square, to: action.to as Square, promotion: action.promotion || 'q' }); s.chessMoves.push(m.san); }
    catch { throw new Error('Illegal chess move'); }
    if (s.drawOffer !== seat) s.drawOffer = null;
    s.turn = chess.turn() === 'w' ? 0 : 1;
    if (chess.isCheckmate()) { s.finished = true; s.result = `${seat === 0 ? 'White' : 'Black'} wins by checkmate`; }
    else if (chess.isStalemate()) { s.finished = true; s.result = 'Draw by stalemate'; }
    else if (chess.isInsufficientMaterial()) { s.finished = true; s.result = 'Draw by insufficient material'; }
    else if (Number(chess.fen().split(' ')[4]) >= 150) { s.finished = true; s.result = 'Draw by seventy-five-move rule'; }
    else {
      const replay = new Chess(); const key = (c: Chess) => c.fen().split(' ').slice(0, 4).join(' ');
      const target = key(chess); let seen = key(replay) === target ? 1 : 0;
      for (const move of s.chessMoves) { replay.move(move); if (key(replay) === target) seen++; }
      if (seen >= 5) { s.finished = true; s.result = 'Draw by fivefold repetition'; }
    }
    return s;
  }
  if (action.type === 'roll') {
    if (s.die !== null) throw new Error('Move a token first');
    const die = roll(); if (!Number.isInteger(die) || die < 1 || die > 6) throw new Error('Invalid roll');
    s.die = s.lastRoll = die;
    if (!legalLudo(s).length) { s.die = null; if (die !== 6) s.turn = (s.turn + 1) % s.seats.length; }
    return s;
  }
  if (action.type !== 'move' || !Number.isInteger(action.token) || !legalLudo(s).includes(action.token!)) throw new Error('Illegal Ludo move');
  const die = s.die!; const t = action.token!;
  s.ludo[seat][t] = s.ludo[seat][t] === -1 ? 0 : s.ludo[seat][t] + die;
  const progress = s.ludo[seat][t];
  if (progress < 52) {
    const pos = (progress + seat * 13) % 52;
    if (!safe.has(pos)) s.ludo.forEach((tokens, other) => { if (other !== seat) tokens.forEach((v, i) => { if (v >= 0 && v < 52 && (v + other * 13) % 52 === pos) tokens[i] = -1; }); });
  }
  s.die = null;
  if (s.ludo[seat].every((p) => p === 57)) { s.finished = true; s.result = `Player ${seat + 1} wins!`; }
  else if (die !== 6) s.turn = (seat + 1) % s.seats.length;
  return s;
}
export function botAction(s: BoardState): BoardAction {
  if (s.game === 'ludo') { if (s.die === null) return { type: 'roll' }; const legal = legalLudo(s); return { type: 'move', token: legal[Math.floor(Math.random() * legal.length)] }; }
  const chess = chessPosition(s.chessMoves); const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => ((b.captured ? 5 : 0) + (b.promotion ? 8 : 0) + Math.random()) - ((a.captured ? 5 : 0) + (a.promotion ? 8 : 0) + Math.random()));
  const m = moves[0]; return { type: 'move', from: m.from, to: m.to, promotion: m.promotion || 'q' };
}
