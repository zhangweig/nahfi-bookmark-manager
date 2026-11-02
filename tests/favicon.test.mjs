import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const bundled = buildSync({
  entryPoints: ['src/utils/favicon.ts'],
  bundle: true,
  write: false,
  format: 'esm',
}).outputFiles[0].text;
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`);

test('browser cache is first and direct favicon works before third-party services', () => {
  globalThis.chrome = { runtime: { getURL: (path) => `chrome-extension://test/${path}` } };
  const chain = api.getFaviconChain('https://example.com/path?q=a&b=c');
  assert.equal(chain[0].name, 'chrome');
  assert.match(chain[0].url, /pageUrl=https%3A%2F%2Fexample.com/);
  assert.equal(chain[1].url, 'https://example.com/favicon.ico');
  assert.equal(chain.at(-1).name, 'avatar');
  assert.ok(api.FAVICON_MIN_SIZE <= 16);
});

test('invalid and internal URLs always have a safe fallback', () => {
  assert.equal(api.getFaviconChain('not a URL')[0].name, 'avatar');
  const internal = api.getFaviconChain('chrome://bookmarks/');
  assert.equal(internal.at(-1).name, 'avatar');
  assert.ok(internal.every((source) => !source.url.startsWith('https://')));
});

test('avatar SVG escapes characters that would break icon rendering', () => {
  const source = api.generateAvatarDataUri('<', 'Example');
  const svg = Buffer.from(source.split(',')[1], 'base64').toString();
  assert.match(svg, /&#60;/);
  assert.ok(!svg.includes('><</text>'));
});
