import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMastery, masteryStats, waveClearBonus } from '../lib/rune-bastion';
import { clearHostileFire, voyageMissions } from '../lib/arcade-features';
import { jump, newSprint, stepSprint, type SprintState } from '../lib/skyline-sprint';
import { ludoMoveExposure } from '../lib/ludo-preview';
import { newBoard } from '../lib/board-games';

test('tower mastery requires level, funds and active play and modifies only its chosen stat', () => {
  assert.deepEqual(chooseMastery(100,2,null,true,'power'),{gold:35,mastery:'power'});
  assert.equal(chooseMastery(64,2,null,true,'power'),null);
  assert.equal(chooseMastery(100,1,null,true,'power'),null);
  assert.equal(chooseMastery(100,2,'speed',true,'power'),null);
  assert.equal(chooseMastery(100,2,null,false,'power'),null);
  assert.deepEqual(masteryStats(100,1,'power'),{damage:135,rate:1});
  assert.deepEqual(masteryStats(100,1,'speed'),{damage:100,rate:.75});
});
test('flawless wave bonus is awarded only when no enemies leak', () => {
  assert.deepEqual(waveClearBonus(2,0),{base:28,flawless:21});
  assert.deepEqual(waveClearBonus(2,1),{base:28,flawless:0});
});
test('EMP clears hostile projectiles but not friendly shots', () => {
  const bolts=[{friendly:false,dead:false},{friendly:true,dead:false},{friendly:false,dead:true}];
  assert.equal(clearHostileFire(bolts),1); assert.deepEqual(bolts.map(b=>b.dead),[true,false,true]);
  assert.equal(clearHostileFire(bolts),0);
});
test('boost pickup permits exactly one extra air jump, but not a duplicate on the ground', () => {
  let s: SprintState={...newSprint(),spawn:100,y:9,objects:[{id:1,kind:'boost',x:19,hit:false}]};
  s=stepSprint(s,0,false); assert.equal(s.boost,true);
  const boosted=jump(s); assert.equal(boosted.velocity,90);assert.equal(boosted.boost,false);assert.equal(jump(boosted),boosted);
  const grounded={...newSprint(),boost:true};const first=jump(grounded); assert.equal(first.boost,true);assert.equal(jump(first),first);
});
test('voyage missions reward each threshold once including simultaneous completions', () => {
  const unclaimed={coins:false,chests:false,survival:false};
  const first=voyageMissions(unclaimed,12,2,45);assert.equal(first.reward,500);
  assert.deepEqual(first.claims,{coins:true,chests:true,survival:true});
  assert.equal(voyageMissions(first.claims,100,20,300).reward,0);
  assert.equal(voyageMissions(unclaimed,11,1,44.9).reward,0);
});
test('Ludo exposure counts only opponents that could reach a vulnerable square on a future roll', () => {
  const b=newBoard('ludo',['human','human','human','human']); b.die=2;b.ludo[0][0]=2;
  b.ludo[1]=[39,41,-1,-1]; // global positions 0 and 2; both can reach position 4
  assert.equal(ludoMoveExposure(b,0),2);
  b.ludo[0][0]=6; assert.equal(ludoMoveExposure(b,0),0); // safe square 8
  b.ludo[0][0]=56; assert.equal(ludoMoveExposure(b,0),0); // illegal overshoot
  b.ludo[0][0]=2; b.ludo[1]=[50,-1,-1,-1]; assert.equal(ludoMoveExposure(b,0),0); // would leave shared track
});
