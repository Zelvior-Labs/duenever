import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../lib/games';
import { gamePageInfo, gameSchema, jsonLd, pageMetadata, PUBLIC_PAGES } from '../lib/seo';

test('game metadata and structured data use actual game information', () => {
  for (const game of GAMES) {
    const info = gamePageInfo(game), metadata = pageMetadata(info), schema = gameSchema(game);
    assert.equal(info.path, `/games/${game.slug}`);
    assert.equal(schema.name, game.title);
    assert.equal(schema.description, game.description);
    assert.equal(metadata.alternates?.canonical, info.path);
    assert.ok(JSON.stringify(metadata.openGraph).includes(encodeURIComponent(info.path)));
  }
  assert.ok(PUBLIC_PAGES['/privacy']);
});

test('structured data cannot terminate its enclosing script', () => {
  const encoded = jsonLd({ text: '</script><script>alert(1)</script>' });
  assert.ok(!encoded.includes('<'));
  assert.equal(JSON.parse(encoded).text, '</script><script>alert(1)</script>');
});
