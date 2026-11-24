import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_SECONDS, TOTAL_SECONDS, advanceRun, choose, ending, newRun, readRun, sceneIndex, type Run } from '../lib/last-line';
import { GAMES } from '../lib/games';

test('catalogue contains a playable, illustrated 15-minute game', () => {
  const game = GAMES.find(g => g.id === 'the-last-line');
  assert.ok(game?.playable); assert.equal(game?.art?.bannerImage, '/games/the-last-line/banner.jpg');
  assert.equal(SCENES.length, 15); assert.equal(TOTAL_SECONDS, 900); assert.equal(SCENE_SECONDS, 60);
  for (const scene of SCENES) { assert.equal(scene.options.length, 3); assert.ok(scene.evidence && scene.pressure && scene.message); }
});
test('the clock moves at real seconds, freezes when not advanced and caps at fifteen minutes', () => {
  const start = newRun(), minute = advanceRun(start, 59.9);
  assert.equal(start.elapsed, 0); assert.equal(sceneIndex(minute), 0);
  const next = advanceRun(minute, .1); assert.equal(sceneIndex(next), 1);
  assert.equal(advanceRun(next, 0), next); assert.equal(advanceRun(next, -1), next); assert.equal(advanceRun(next, NaN), next);
  assert.equal(advanceRun(next, 10000).elapsed, TOTAL_SECONDS);
});
test('choices are revisable only within the current minute and locked afterward', () => {
  let run = choose(newRun(), 0); run = choose(run, 1); assert.equal(run.answers[0], 1);
  run = advanceRun(run, 60); run = choose(run, 2); assert.deepEqual(run.answers.slice(0,2), [1,2]);
  assert.equal(choose(run, 3), run); assert.equal(choose(run, -1), run);
  const finished = advanceRun(run, TOTAL_SECONDS); assert.equal(choose(finished, 0), finished);
});
test('endings reflect the final decision and the evidence and witnesses assembled', () => {
  function play(options: number[], final: number | null): Run {
    let r = newRun();
    options.forEach(option => { r = choose(r, option); r = advanceRun(r, 60); });
    if (final !== null) r = choose(r, final);
    return advanceRun(r, 60);
  }
  const documented = ending(play(Array(14).fill(0),0));
  const sparse = ending(play(Array(14).fill(2),0));
  assert.equal(documented.title, 'The file goes out'); assert.equal(documented.proof,14); assert.notEqual(documented.text,sparse.text);
  const informed = ending(play(Array(14).fill(1),2));
  const unwarned = ending(play(Array(14).fill(2),2));
  assert.equal(informed.title,'The diversion'); assert.equal(informed.witnesses,14); assert.notEqual(informed.text,unwarned.text);
  assert.equal(ending(play(Array(14).fill(2),null)).title,'The desk defaults to hold');
  assert.equal(ending(play(Array(14).fill(2),1)).title,'The hold');
});
test('save validation rejects damaged, future, or impossible selections', () => {
  const run=choose(newRun(),1); assert.deepEqual(readRun(run),run);
  assert.equal(readRun({ ...run, elapsed: -1 }),null);
  assert.equal(readRun({ ...run, elapsed: Infinity }),null);
  assert.equal(readRun({ ...run, answers: [0] }),null);
  const future = [...run.answers]; future[4]=1; assert.equal(readRun({...run,answers:future}),null);
  const invalid = [...run.answers]; invalid[0]=5; assert.equal(readRun({...run,answers:invalid}),null);
  assert.equal(readRun({elapsed:0,answers:Array(15)}),null);
});
