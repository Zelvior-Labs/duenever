import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainTargets, selectTarget, repairBastion, waveLabel } from '../lib/rune-bastion';
import { rocketCombo, treasureReward } from '../lib/arcade-features';
import { addTile, dailySeed, newGrid, seededRandom, slide } from '../lib/circuit-merge';
import { ludoTokenStatus } from '../lib/ludo-preview';
import { chessInsights } from '../lib/chess-insights';
import { newSprint, sprintScore, stepSprint, type SprintState } from '../lib/skyline-sprint';

test('rune towers select first, last or strongest living target within range', () => {
  const foes=[{x:1,y:0,hp:20,prog:20},{x:3,y:0,hp:50,prog:10},{x:100,y:0,hp:1000,prog:100},{x:2,y:0,hp:0,prog:100}];
  assert.equal(selectTarget(foes,0,0,10,'first'),foes[0]);
  assert.equal(selectTarget(foes,0,0,10,'last'),foes[1]);
  assert.equal(selectTarget(foes,0,0,10,'strongest'),foes[1]);
  assert.equal(selectTarget(foes,200,0,1,'first'),null);
});
test('storm chain jumps to nearest distinct living targets up to its limit', () => {
  const foes=[{x:0,y:0,hp:3,prog:1},{x:5,y:0,hp:2,prog:2},{x:10,y:0,hp:2,prog:3},{x:15,y:0,hp:2,prog:4},{x:1,y:0,hp:0,prog:5}];
  assert.deepEqual(chainTargets(foes[0],foes,6,3),foes.slice(0,3));
  assert.deepEqual(chainTargets(foes[0],foes,2,3),[foes[0]]);
  assert.deepEqual(chainTargets(foes[0],foes,6,0),[]);
});
test('repair only spends gold between waves while playing and caps lives', () => {
  assert.deepEqual(repairBastion(45,19,'build',true),{gold:0,lives:20});
  for (const args of [[44,10,'build',true],[45,20,'build',true],[45,10,'combat',true],[45,10,'build',false],[45,0,'build',true]] as const) assert.equal(repairBastion(args[0],args[1],args[2],args[3]),null);
  assert.equal(waveLabel(8),'Dragon boss'); assert.equal(waveLabel(2),'Swift enemies');
});
test('rocket combo grows, caps, expires and treasure rewards restore only on streak milestones', () => {
  assert.deepEqual(rocketCombo(4,1,10),{streak:5,remaining:4,multiplier:1,points:10});
  assert.equal(rocketCombo(5,1,10).points,20); assert.equal(rocketCombo(99,1,10).points,40);
  assert.equal(rocketCombo(99,0,10).points,10);
  assert.deepEqual(treasureReward('chest',9,2),{score:100,streak:9,lives:2});
  assert.deepEqual(treasureReward('coin',9,2),{score:28,streak:10,lives:3});
  assert.equal(treasureReward('coin',9,3).lives,3);
});
test('clean skyline clears award a growing bonus once and hits break the streak', () => {
  let s: SprintState = {...newSprint(),spawn:100,objects:[{id:1,kind:'crate',x:7,hit:false}]};
  s=stepSprint(s,0,false); assert.equal(s.bonus,5); assert.equal(s.cleanStreak,1);
  s=stepSprint(s,0,false); assert.equal(s.bonus,5);
  s={...s,objects:[{id:2,kind:'drone',x:7,hit:false}]}; s=stepSprint(s,0,false); assert.equal(s.bonus,15); assert.equal(sprintScore(s),15);
  s={...s,objects:[{id:3,kind:'crate',x:19,hit:false}]}; s=stepSprint(s,0,false); assert.equal(s.cleanStreak,0);
});
test('daily circuits replay identical spawns and snapshot seeds can be restored', () => {
  const run=()=>{let seed=dailySeed('2026-01-02');const random=()=>{const n=seededRandom(seed);seed=n.seed;return n.value};let g=newGrid(random);const saved=seed;const moved=slide(g,'left');g=addTile(moved.grid,random);const first=g.slice();seed=saved;assert.deepEqual(addTile(moved.grid,random),first);return first;};
  assert.deepEqual(run(),run()); assert.notEqual(dailySeed('2026-01-02'),dailySeed('2026-01-03'));
});
test('board insights report captures including en passant and token progress', () => {
  const info=chessInsights(['e4','a6','e5','d5','exd6']);
  assert.deepEqual(info.whiteCaptures,['p']); assert.deepEqual(info.last,{from:'e5',to:'d6'});
  assert.match(ludoTokenStatus(-1),/roll six/);assert.equal(ludoTokenStatus(57),'Home');assert.match(ludoTokenStatus(55),/2 steps.*home lane/);
});
