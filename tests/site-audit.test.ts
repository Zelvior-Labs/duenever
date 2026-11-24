import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardImage, heroImage } from '../lib/image-variants';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { SITE_URL } from '../lib/site-url';

test('crawler rules link to a sitemap containing only public pages', () => {
  assert.equal(robots().sitemap, `${SITE_URL}/sitemap.xml`);
  const urls = sitemap().map(page => page.url);
  assert.deepEqual(urls, [`${SITE_URL}/`, `${SITE_URL}/mcp`, `${SITE_URL}/about`, `${SITE_URL}/privacy`]);
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
