import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../lib/games';
import { GAME_STORIES, getGameStory, unlockedStoryNotes, type StoryId } from '../lib/game-stories';

test('every playable catalogue game has a distinct opening and unknown ids are safe', () => {
  const stories = GAMES.filter(game => game.playable).map(game => getGameStory(game.id));
  assert.ok(stories.every(story => story && story.introduction.length > 60));
  assert.equal(new Set(stories.map(story => story?.title)).size, stories.length);
  assert.equal(getGameStory('unknown'), undefined);
  assert.equal(getGameStory('toString'), undefined);
});
test('field notes unlock in order, only from the progress of the current run', () => {
  assert.equal(unlockedStoryNotes('rune-bastion', 2).length, 1);
  assert.equal(unlockedStoryNotes('rune-bastion', 3).length, 2);
  assert.equal(unlockedStoryNotes('rune-bastion', 8).length, 3);
  assert.equal(unlockedStoryNotes('rune-bastion', 0).length, 1);
  assert.equal(unlockedStoryNotes('rocket-rampage', 0).length, 0);
  assert.equal(unlockedStoryNotes('rocket-rampage', 1).length, 1);
  assert.equal(unlockedStoryNotes('circuit-merge', 2048).length, 4);
  assert.equal(unlockedStoryNotes('circuit-merge', 64).length, 1); // undo and new runs
  assert.equal(unlockedStoryNotes('treasure-drift', 29).length, 1);
  assert.equal(unlockedStoryNotes('treasure-drift', 30).length, 2);
  assert.equal(unlockedStoryNotes('skyline-sprint', 700).length, 3);
  assert.equal(unlockedStoryNotes('skyline-sprint', Number.NaN).length, 1);
});
test('board game scenes do not add rules or progression', () => {
  for (const id of ['chess', 'ludo'] as StoryId[]) {
    assert.equal(GAME_STORIES[id].unit, null);
    assert.deepEqual(unlockedStoryNotes(id, 1e6), []);
  }
});
test('all chapter thresholds are ordered and labels are unique per story', () => {
  for (const story of Object.values(GAME_STORIES)) {
    assert.deepEqual(story.notes.map(note => note.at), story.notes.map(note => note.at).slice().sort((a,b) => a-b));
    assert.equal(new Set(story.notes.map(note => note.heading)).size, story.notes.length);
  }
});
