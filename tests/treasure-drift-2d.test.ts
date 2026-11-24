import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSea, seaBounds, seaCollision, seaTarget, stepSea, type SeaItem } from '../lib/treasure-drift';

const view = { width: 400, height: 800 };
test('ship can steer in both axes and stays below the HUD and within the field', () => {
  const initial = newSea();
  const moved = stepSea(initial, .05, { x: 1, y: -1 }, view).sea;
  assert.ok(moved.x > initial.x); assert.ok(moved.y < initial.y);
  assert.equal(initial.x, 50); assert.equal(initial.y, 80);
  const bounds = seaBounds(view), target = seaTarget(view, -50, -50);
  assert.equal(target.x, bounds.minX); assert.equal(target.y, bounds.minY);
  const edge = stepSea({ ...initial, x: bounds.maxX, y: bounds.maxY }, .05, { x: 1, y: 1 }, view).sea;
  assert.equal(edge.x, bounds.maxX); assert.equal(edge.y, bounds.maxY);
});
test('diagonal keyboard movement has the same screen-space speed as straight movement', () => {
  const initial = newSea(), straight = stepSea(initial, .05, { x: 1, y: 0 }, view).sea, diagonal = stepSea(initial, .05, { x: 1, y: 1 }, view).sea;
  const pixels = (x: number, y: number) => Math.hypot((x-50)*view.width/100, (y-80)*view.height/100);
  assert.ok(Math.abs(pixels(straight.x, straight.y)-pixels(diagonal.x, diagonal.y)) < 1e-9);
});
test('two-dimensional hitboxes respect viewport geometry and actual ship position', () => {
  const ship = { x: 50, y: 40 }, item: SeaItem = { id: 1, kind: 'coin', x: 50, y: 40 };
  assert.equal(seaCollision(ship, item, view), true);
  assert.equal(seaCollision(ship, { ...item, y: 80 }, view), false);
  assert.equal(seaCollision(ship, { ...item, x: 90 }, view), false);
  assert.equal(seaCollision(ship, item, { width: 1200, height: 700 }), true);
});
test('collection, invulnerability and one-time missions work anywhere in the ocean', () => {
  const ship = { ...newSea(), y: 40, targetY: 40, spawn: 10, totalCoins: 11, items: [{ id: 1, kind: 'coin' as const, x: 50, y: 40 }] };
  const pickup = stepSea(ship, 0, { x: 0, y: 0 }, view);
  assert.equal(pickup.sea.totalCoins, 12); assert.equal(pickup.sea.score, 160); assert.deepEqual(pickup.events, ['collect', 'mission']);
  const collision = stepSea({ ...pickup.sea, items: [{ id: 2, kind: 'rock', x: 50, y: 40 }] }, 0, { x: 0, y: 0 }, view);
  assert.equal(collision.sea.lives, 2); assert.deepEqual(collision.events, ['hit']);
  const protectedHit = stepSea({ ...collision.sea, items: [{ id: 3, kind: 'rock', x: 50, y: 40 }] }, 0, { x: 0, y: 0 }, view);
  assert.equal(protectedHit.sea.lives, 2); assert.deepEqual(protectedHit.events, []); assert.equal(protectedHit.sea.score, 160);
});
test('pointer destination is approached at a bounded speed and does not teleport the ship', () => {
  const state = { ...newSea(), targetX: 90, targetY: 20, spawn: 10 };
  const next = stepSea(state, .05, { x: 0, y: 0 }, view).sea;
  assert.ok(next.x > state.x && next.x < 90); assert.ok(next.y < state.y && next.y > 20);
});
