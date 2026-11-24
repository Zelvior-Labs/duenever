import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio } from '../lib/game-audio';

test('audio starts only after unlock, observes mute and stops on cleanup', () => {
  let starts = 0, stops = 0, closes = 0, contexts = 0;
  const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  class MockContext {
    state = 'running'; currentTime = 0;
    destination = {};
    constructor() { contexts++; }
    createOscillator() { return { type:'', frequency:param, onended:null, connect() {}, disconnect() {}, start() { starts++; }, stop() { stops++; } }; }
    createGain() { return { gain:param, connect() {}, disconnect() {} }; }
    close() { closes++; this.state = 'closed'; return Promise.resolve(); }
  }
  const global = globalThis as unknown as { window?: unknown };
  const original = global.window;
  global.window = { AudioContext: MockContext };
  try {
    const audio = new GameAudio();
    audio.play('jump'); assert.equal(contexts, 0); assert.equal(starts, 0);
    audio.unlock(); audio.play('jump'); assert.equal(starts, 1);
    audio.muted = true; audio.play('hit'); assert.equal(starts, 1);
    audio.stop(); assert.equal(stops, 2); // scheduled end and immediate cancellation
    audio.close(); assert.equal(closes, 1);
  } finally { global.window = original; }
});
