import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absorbHit, attractTreasure, canUsePulse, chooseRocketDrop } from '../lib/arcade-upgrades';
import { suggestMove, slide } from '../lib/circuit-merge';
import { newBoard, boardAction } from '../lib/board-games';
import { ludoMovePreview } from '../lib/ludo-preview';

test('rocket drops and shields include all upgrades and absorb one hit', () => {
  assert.deepEqual([0,.2,.4,.6,.8].map(n=>chooseRocketDrop(()=>n)), ['repair','rapid','spread','shield','emp']);
  assert.deepEqual(absorbHit(2,true),{lives:2,shield:false});
  assert.deepEqual(absorbHit(2,false),{lives:1,shield:false});
});
test('magnet attracts coins only while active and pulse respects its cooldown', () => {
  assert.equal(attractTreasure(0,100,1,false),0);
  assert.ok(attractTreasure(0,100,1,true)>90);
  assert.equal(attractTreasure(0,100,-1,true),0);
  assert.equal(canUsePulse(0,true,1),true);
  assert.equal(canUsePulse(1,true,1),false);
  assert.equal(canUsePulse(0,false,1),false);
  assert.equal(canUsePulse(0,true,0),false);
});
test('circuit suggestion is legal, prioritizes immediate merges and never mutates the grid', () => {
  const grid=[2,2,4,0,...Array(12).fill(0)], before=grid.slice();
  const hint=suggestMove(grid); assert.ok(hint); assert.equal(slide(grid,hint).score,4); assert.deepEqual(grid,before);
  assert.equal(suggestMove([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2]),null);
});
test('Ludo previews describe legal actions without changing the authoritative board', () => {
  const s=newBoard('ludo',['human','human','human','human']); s.die=6;
  assert.equal(ludoMovePreview(s,0),'Enter on safe square');
  assert.equal(s.ludo[0][0],-1);
  s.die=2; s.ludo[0]=[1,6,50,55]; s.ludo[1][0]=42;
  assert.equal(ludoMovePreview(s,0),'Capture 1');
  assert.equal(boardAction(s,0,{type:'move',token:0},()=>1).ludo[1][0],-1);
  assert.equal(ludoMovePreview(s,1),'Safe square');
  assert.equal(ludoMovePreview(s,2),'Home lane');
  assert.equal(ludoMovePreview(s,3),'Finish');
  s.die=3; assert.equal(ludoMovePreview(s,3),null);
});
