import 'server-only';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { BoardAction, BoardGame, BoardState, boardAction, botAction, newBoard } from './board-games';

type Room = { code: string; version: number; expires: number; board: BoardState; players: ({ hash: string; name: string } | null)[] };
const memory = new Map<string, Room>();
const mode = () => process.env.ROOM_STORE === 'memory' ? 'memory' : 'online';
const token = (n: number) => randomBytes(n).toString('base64url');
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function gateway() { const base = process.env.SUPABASE_URL, secret = process.env.ROOM_GATEWAY_TOKEN; if (!base || !secret) throw new Error('Online rooms are not configured'); return { url: `${base.replace(/\/$/, '')}/functions/v1/game-rooms`, secret }; }
async function call(body: unknown): Promise<unknown> { const { url, secret } = gateway(); const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-token': secret }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error('Room service unavailable'); return r.json(); }
async function get(code: string): Promise<Room | null> {
  let room: Room | null;
  if (mode() === 'memory') room = memory.get(code) || null;
  else { const result = await call({ op: 'get', code }) as { room: Room | null }; room = result.room; }
  return room && room.expires > Date.now() ? structuredClone(room) : null;
}
async function create(room: Room) {
  if (mode() === 'memory') {
    for (const [code, existing] of memory) if (existing.expires <= Date.now()) memory.delete(code);
    if (memory.size >= 1000) throw new Error('Room capacity reached');
    memory.set(room.code, structuredClone(room)); return;
  }
  await call({ op: 'create', room });
}
async function save(room: Room, version: number): Promise<boolean> {
  room.version = version + 1;
  if (mode() === 'memory') { if (memory.get(room.code)?.version !== version) return false; memory.set(room.code, structuredClone(room)); return true; }
  const result = await call({ op: 'save', room, version }) as { ok: boolean }; return result.ok;
}
function view(room: Room, seat: number) { return { code: room.code, version: room.version, seat, board: room.board, names: room.players.map((p, i) => room.board.seats[i] === 'bot' ? `Bot ${i + 1}` : p?.name || 'Waiting…'), ready: room.players.every((p, i) => room.board.seats[i] === 'bot' || !!p), expires: room.expires }; }
function authenticate(room: Room, raw: unknown): number {
  if (typeof raw !== 'string' || raw.length > 128) return -1;
  const hash = digest(raw); return room.players.findIndex((p) => !!p && equal(p.hash, hash));
}
function cleanName(value: unknown) { return typeof value === 'string' ? value.trim().slice(0, 24) || 'Player' : 'Player'; }
const ready = (r: Room) => r.players.every((p, i) => r.board.seats[i] === 'bot' || !!p);
function advanceBots(room: Room) { for (let i = 0; i < 128 && !room.board.finished && room.board.seats[room.board.turn] === 'bot'; i++) room.board = boardAction(room.board, room.board.turn, botAction(room.board), () => randomInt(1, 7)); }
export async function handleRoom(data: Record<string, unknown>) {
  if (data.op === 'create') {
    if (data.game !== 'chess' && data.game !== 'ludo') throw new Error('Unknown game');
    const game = data.game as BoardGame;
    const count = game === 'chess' ? 2 : Number(data.count);
    const humans = Number(data.humans);
    if (!Number.isInteger(count) || count < 2 || count > (game === 'chess' ? 2 : 4) || !Number.isInteger(humans) || humans < 1 || humans > count) throw new Error('Invalid players');
    const seats = Array.from({ length: count }, (_, i) => i < humans ? 'human' as const : 'bot' as const);
    const credential = token(32); const room: Room = { code: token(16), version: 0, expires: Date.now() + 24 * 60 * 60 * 1000, board: newBoard(game, seats), players: seats.map((_, i) => i === 0 ? { hash: digest(credential), name: cleanName(data.name) } : null) };
    await create(room); return { ...view(room, 0), credential };
  }
  if (typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(data.code)) throw new Error('Invalid room code');
  const room = await get(data.code); if (!room) throw new Error('Room not found or expired');
  const version = room.version;
  if (data.op === 'join') {
    if (data.game !== undefined && data.game !== room.board.game) throw new Error(`This is a ${room.board.game} room. Open that game to join.`);
    const seat = room.players.findIndex((p, i) => room.board.seats[i] === 'human' && !p);
    if (seat < 0) throw new Error('Room is full');
    const credential = token(32); room.players[seat] = { hash: digest(credential), name: cleanName(data.name) };
    if (ready(room)) advanceBots(room);
    if (!await save(room, version)) throw new Error('Room changed; try again');
    return { ...view(room, seat), credential };
  }
  const seat = authenticate(room, data.credential); if (seat < 0) throw new Error('Invalid room credentials');
  if (data.op === 'leave') {
    room.players[seat] = null;
    if (!await save(room, version)) throw new Error('Room changed; try again');
    return { ok: true };
  }
  if (data.op === 'state') {
    if (ready(room) && !room.board.finished && room.board.seats[room.board.turn] === 'bot') {
      advanceBots(room);
      if (!await save(room, version)) throw new Error('Room changed; try again');
    }
    return view(room, seat);
  }
  if (data.op !== 'action' || !ready(room) || !data.action || typeof data.action !== 'object') throw new Error('Room is not ready');
  room.board = boardAction(room.board, seat, data.action as BoardAction, () => randomInt(1, 7)); advanceBots(room);
  if (!await save(room, version)) throw new Error('Room changed; try again');
  return view(room, seat);
}
