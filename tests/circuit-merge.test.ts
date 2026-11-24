import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTile, canMove, newGrid, slide } from '../lib/circuit-merge';

test('equal tiles merge once per move in movement order', () => {
  const grid = [2,2,2,2, 4,0,4,4, 0,0,0,0, 0,0,0,0];
  const moved=slide(grid,'left');
  assert.deepEqual(moved.grid.slice(0,8), [4,4,0,0, 8,4,0,0]); assert.equal(moved.score,16);
  assert.deepEqual(grid.slice(0,4),[2,2,2,2]);
  assert.deepEqual(slide(grid,'right').grid.slice(0,8), [0,0,4,4, 0,0,4,8]);
});
test('vertical movement, no-op, spawning and game-over detection', () => {
  const grid=[2,4,8,16, 2,8,16,32, 4,16,32,64, 8,32,64,128];
  assert.deepEqual(slide(grid,'up').grid.filter((_,i)=>i%4===0),[4,4,8,0]);
  assert.equal(canMove(grid),true);
  const stuck=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];
  assert.equal(canMove(stuck),false); assert.equal(slide(stuck,'left').changed,false);
  assert.equal(newGrid(()=>0).filter(Boolean).length,2);
  assert.equal(addTile(Array(16).fill(0),()=>0)[0],2);
});
