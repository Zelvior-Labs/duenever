import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardImage, heroImage } from '../lib/image-variants';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { SITE_URL } from '../lib/site-url';

test('crawler rules link to a sitemap containing only public pages', async () => {
  assert.equal(robots().sitemap, `${SITE_URL}/sitemap.xml`);
  const urls = (await sitemap()).map(page => page.url);
  for (const path of ['/', '/mcp', '/about', '/privacy', '/games/chess']) assert.ok(urls.includes(`${SITE_URL}${path}`));
  assert.ok(!urls.some(url => url.includes('control-center') || url.includes('/api/')));
});

test('optimized images only replace bundled artwork, not custom overrides', () => {
  assert.equal(cardImage('/games/chess/banner.jpg'), '/games/chess/card.webp');
  assert.equal(heroImage('/games/rocket-rampage/banner.jpg'), '/games/rocket-rampage/hero.webp');
  assert.equal(heroImage('https://example.com/banner.jpg'), 'https://example.com/banner.jpg');
  assert.equal(cardImage('/custom.jpg'), '/custom.jpg');
});

test('served pages expose metadata, crawler files and security headers', { skip: !process.env.SITE_TEST_URL }, async () => {
  const base = process.env.SITE_TEST_URL!;
  const response = await fetch(`${base}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-security-policy') ?? '', /object-src 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /aria-label="Filter games by title or tag"/);
  const robotsResponse = await fetch(`${base}/robots.txt`);
  assert.equal(robotsResponse.status, 200);
  assert.match(await robotsResponse.text(), /Sitemap: https:\/\/duenever\.vercel\.app\/sitemap\.xml/);
  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200);
  assert.match(await sitemapResponse.text(), /<loc>https:\/\/duenever\.vercel\.app\/privacy<\/loc>/);
});


test('game pages and social cards are generated from catalog data', { skip: !process.env.SITE_TEST_URL }, async () => {
  const base = process.env.SITE_TEST_URL!;
  const page = await fetch(`${base}/games/chess`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /How do I play Chess\?/);
  assert.match(html, /FAQPage/);
  assert.match(html, /VideoGame/);
  assert.match(html, /https:\/\/duenever\.vercel\.app\/games\/chess/);
  const card = await fetch(`${base}/og?path=%2Fgames%2Fchess`);
  assert.equal(card.status, 200);
  assert.equal(card.headers.get('content-type'), 'image/jpeg');
  const bytes = new Uint8Array(await card.arrayBuffer());
  assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
  assert.ok(bytes.length < 500_000, 'social card should stay compact');
  assert.equal((await fetch(`${base}/og?path=toString`)).status, 404);
  assert.equal((await fetch(`${base}/games/not-a-game`)).status, 404);
});
