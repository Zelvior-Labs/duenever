import { test } from 'node:test';
import assert from 'node:assert/strict';

// Optional end-to-end test against an explicitly supplied disposable LAN server.
// Example: ROOM_TEST_URL=http://127.0.0.1:3024 npm test
const base = process.env.ROOM_TEST_URL;
async function room(body) {
  const response = await fetch(`${base}/api/rooms`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

test('real room API versions state, protects credentials, rejects cross-game join and conflicting moves', { skip: !base }, async () => {
  const host = (await room({op:'create',game:'chess',humans:2,name:'Host'})).data;
  assert.equal(host.version, 0);
  const wrong = await room({op:'join',game:'ludo',code:host.code});
  assert.equal(wrong.status, 400); assert.match(wrong.data.error, /chess room/);
  const guestResponse = await room({op:'join',game:'chess',code:host.code,name:'Guest'});
  assert.equal(guestResponse.status, 200);
  const guest = guestResponse.data; assert.equal(guest.version, 1); assert.equal(guest.ready, true);
  assert.equal((await room({op:'state',code:host.code,credential:'wrong'})).status, 400);
  const white = await room({op:'action',code:host.code,credential:host.credential,action:{type:'move',from:'e2',to:'e4'}});
  assert.equal(white.data.version, 2); assert.deepEqual(white.data.board.chessMoves, ['e4']);
  const play = {op:'action',code:host.code,credential:guest.credential,action:{type:'move',from:'e7',to:'e5'}};
  const pair = await Promise.all([room(play), room(play)]);
  assert.deepEqual(pair.map(r=>r.status).sort(), [200,400]);
  const state = await room({op:'state',code:host.code,credential:host.credential});
  assert.equal(state.data.version, 3); assert.deepEqual(state.data.board.chessMoves, ['e4','e5']);
  assert.equal((await room({op:'leave',code:guest.code,credential:guest.credential})).status, 200);
  assert.equal((await room({op:'state',code:guest.code,credential:guest.credential})).status, 400);
  const replacement = await room({op:'join',game:'chess',code:host.code,name:'Replacement'});
  assert.equal(replacement.status, 200); assert.equal(replacement.data.version, 5);
});

test('real Ludo room rolls on the server and returns a versioned state', { skip: !base }, async () => {
  const host = (await room({op:'create',game:'ludo',count:2,humans:2})).data;
  await room({op:'join',game:'ludo',code:host.code});
  const roll = await room({op:'action',code:host.code,credential:host.credential,action:{type:'roll'}});
  assert.equal(roll.status, 200); assert.equal(roll.data.version, 2);
  assert.ok(roll.data.board.lastRoll >= 1 && roll.data.board.lastRoll <= 6);
});
