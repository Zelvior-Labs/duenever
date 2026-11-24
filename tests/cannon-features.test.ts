import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectileArrives, splashProfile } from '../lib/rune-bastion';
import { slide, suggestMove } from '../lib/circuit-merge';

test('cannon splash is wider but does not slow, frost still slows', () => {
  const frost = splashProfile('frost'), cannon = splashProfile('cannon');
  assert.ok(cannon.radius > frost.radius);
  assert.equal(cannon.slow, false);
  assert.equal(frost.slow, true);
});
test('lobbed shots arrive even when a frame crosses their landing point', () => {
  assert.equal(projectileArrives(31, 300, .1), true);
  assert.equal(projectileArrives(45, 300, .1), false);
  assert.equal(projectileArrives(0, 300, 0), true);
});
test('circuit lookahead is deterministic, legal and does not alter the board', () => {
  const grid = [2,4,8,16,4,8,16,32,8,16,32,64,0,2,4,8];
  const before = grid.slice(), suggestion = suggestMove(grid);
  assert.ok(suggestion);
  assert.equal(slide(grid, suggestion).changed, true);
  assert.equal(suggestMove(grid), suggestion);
  assert.deepEqual(grid, before);
});
