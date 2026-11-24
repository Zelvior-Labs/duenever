import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { boardAction, newBoard } from '../lib/board-games.ts';

// HTTP stub uses the real rule engine, while the actual MCP SDK and stdio
// process exercise negotiation, JSON-RPC, schemas and secret handling.
async function stub() {
  const rooms = new Map();
  const server = createServer(async (req, res) => {
    try {
      let body = ''; for await (const chunk of req) body += chunk;
      const d = JSON.parse(body);
      let room, seat;
      const view = () => ({ code: room.code, seat, board: room.board, names: room.names, ready: room.credentials.every(Boolean), expires: Date.now() + 86400000 });
      let result;
      if (d.op === 'create') {
        room = { code: randomBytes(16).toString('base64url'), board: newBoard(d.game, Array(d.humans).fill('human').concat(Array(d.count - d.humans).fill('bot'))), credentials: Array(d.count).fill(null), names: Array(d.count).fill('Waiting') };
        seat = 0; room.credentials[seat] = randomBytes(32).toString('base64url'); room.names[seat] = d.name; rooms.set(room.code, room);
        result = { ...view(), credential: room.credentials[seat] };
      } else {
        room = rooms.get(d.code); if (!room) throw new Error('Room not found or expired');
        if (d.op === 'join') {
          seat = room.credentials.findIndex((c, i) => !c && room.board.seats[i] === 'human');
          if (seat < 0) throw new Error('Room is full');
          room.credentials[seat] = randomBytes(32).toString('base64url'); room.names[seat] = d.name;
          result = { ...view(), credential: room.credentials[seat] };
        } else {
          seat = room.credentials.indexOf(d.credential); if (seat < 0 || !d.credential) throw new Error('Invalid room credentials');
          if (d.op === 'action') room.board = boardAction(room.board, seat, d.action, () => 6);
          if (d.op === 'leave') { room.credentials[seat] = null; result = { ok: true }; } else result = view();
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
    } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, rooms, url: `http://127.0.0.1:${server.address().port}` };
}
async function connect(url, dir) {
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['mcp/server.mjs'], cwd: process.cwd(), env: { ...process.env, DUENEVER_URL: url, DUENEVER_MCP_DATA_DIR: dir }, stderr: 'pipe' });
  await client.connect(transport);
  return client;
}
const call = (client, name, args) => client.callTool({ name, arguments: args });
const json = response => JSON.parse(response.content[0].text);

test('stdio MCP client can join, play, resume and leave without revealing credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'duenever-mcp-'));
  const { server, rooms, url } = await stub();
  let client;
  try {
    client = await connect(url, dir);
    const tools = await client.listTools();
    assert.ok(tools.tools.some(t => t.name === 'chess_move'));
    assert.ok(tools.tools.some(t => t.name === 'ludo_roll'));
    const bad = await call(client, 'join_room', { code: 'not-a-room' });
    assert.equal(bad.isError, true);
    const created = await call(client, 'create_room', { game: 'chess', players: 2, humans: 2 });
    const code = json(created).code;
    assert.equal(json(created).ready, false);
    const savedFile = join(dir, (await readdir(dir))[0]);
    const saved = JSON.parse(await readFile(savedFile, 'utf8'));
    assert.equal((await stat(savedFile)).mode & 0o777, 0o600);
    assert.ok(!JSON.stringify(created).includes(saved.credential));
    const friendResponse = await fetch(`${url}/api/rooms`, { method: 'POST', body: JSON.stringify({ op:'join', code, name:'Friend' }) });
    const friend = await friendResponse.json();
    const state = await call(client, 'get_game_state', { code });
    assert.equal(json(state).yourTurn, true);
    assert.ok(json(state).legalMoves.some(m => m.from === 'e2' && m.to === 'e4'));
    const move = await call(client, 'chess_move', { code, from:'e2', to:'e4' });
    assert.equal(json(move).moves[0], 'e4');
    assert.equal(json(move).yourTurn, false);
    assert.ok(!JSON.stringify(move).includes(saved.credential));
    const illegal = await call(client, 'chess_move', { code, from:'d2', to:'d4' });
    assert.equal(illegal.isError, true);
    await fetch(`${url}/api/rooms`, { method:'POST', body:JSON.stringify({ op:'action', code, credential:friend.credential, action:{ type:'move', from:'e7', to:'e5' } }) });
    await client.close(); client = await connect(url, dir);
    assert.equal(json(await call(client, 'get_game_state', { code })).moves[1], 'e5');
    const duplicate = await call(client, 'join_room', { code }); assert.equal(duplicate.isError, true);
    assert.equal(json(await call(client, 'leave_room', { code })).left, true);
    assert.equal(rooms.get(code).credentials[0], null);
    assert.deepEqual(await readdir(dir), []);
  } finally { await client?.close(); await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive:true, force:true }); }
});

test('MCP joins an existing Ludo room and uses server dice and one-based token choices', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'duenever-mcp-'));
  const { server, rooms, url } = await stub(); let client;
  try {
    const host = await (await fetch(`${url}/api/rooms`, { method:'POST', body:JSON.stringify({ op:'create', game:'ludo', count:2, humans:2, name:'Host' }) })).json();
    client = await connect(url, dir);
    const attempts = await Promise.all([
      call(client, 'join_room', { code:host.code, name:'Opponent' }),
      call(client, 'join_room', { code:host.code, name:'Opponent' })
    ]);
    assert.equal(attempts.filter(result => result.isError).length, 1);
    const joined = json(attempts.find(result => !result.isError));
    assert.equal(joined.seat, 2); assert.equal(joined.yourTurn, false);
    // Set up the opponent's turn; actions below use the real Ludo engine.
    rooms.get(host.code).board.turn = 1;
    const rolled = json(await call(client, 'ludo_roll', { code:host.code }));
    assert.equal(rolled.lastRoll, 6); assert.deepEqual(rolled.legalTokens, [1, 2, 3, 4]);
    const moved = json(await call(client, 'ludo_move', { code:host.code, token:1 }));
    assert.equal(moved.tokens[1].positions[0], 0); assert.equal(moved.yourTurn, true);
    const resigned = await call(client, 'resign', { code:host.code });
    assert.equal(json(resigned).finished, true);
  } finally { await client?.close(); await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive:true, force:true }); }
});
