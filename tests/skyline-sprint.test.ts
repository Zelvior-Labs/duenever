import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jump, newSprint, sprintScore, stepSprint, type SprintState } from '../lib/skyline-sprint';

test('jump rises, lands and cannot be repeated in the air', () => {
  let s=jump(newSprint()); s=stepSprint(s,.05,false,()=>.9); assert.ok(s.y>0); assert.equal(jump(s),s);
  for(let i=0;i<30;i++)s=stepSprint(s,.05,false,()=>.9);
  assert.equal(s.y,0); assert.equal(s.velocity,0);
});
test('jump clears a crate and sliding clears a drone', () => {
  const s=newSprint();s.spawn=100;s.objects=[{id:1,kind:'crate',x:19,hit:false}];
  assert.equal(stepSprint(s,0,false).lives,2);
  assert.equal(stepSprint({...s,y:9},0,false).lives,3);
  s.objects=[{id:2,kind:'drone',x:19,hit:false}];
  assert.equal(stepSprint(s,0,false).lives,2);assert.equal(stepSprint(s,0,true).lives,3);
});
test('cells score once and invulnerability prevents repeated hits', () => {
  const s=newSprint();s.spawn=100;s.objects=[{id:1,kind:'cell',x:19,hit:false},{id:2,kind:'crate',x:19,hit:false}];
  const next=stepSprint({...s,y:9},0,false);
  assert.equal(next.cells,1);assert.equal(sprintScore(next),50);assert.equal(next.lives,3);
  const protectedState=stepSprint({...s,invincible:1},0,false);assert.equal(protectedState.lives,3);
});
test('well-timed jump can clear a moving crate without damage', () => {
  let s=jump({...newSprint(),spawn:100,objects:[{id:1,kind:'crate',x:32,hit:false}]});
  for(let i=0;i<70;i++)s=stepSprint(s,.016,false,()=>.9);
  assert.equal(s.lives,3);
  assert.ok(s.objects[0].x<19);
});
test('holding slide clears a moving drone', () => {
  let s: SprintState={...newSprint(),spawn:100,objects:[{id:1,kind:'drone',x:32,hit:false}]};
  for(let i=0;i<70;i++)s=stepSprint(s,.016,true,()=>.9);
  assert.equal(s.lives,3);
});

test('jump cannot be triggered twice before the first physics step', () => {
  const s = jump(newSprint());
  assert.equal(jump(s), s);
});
