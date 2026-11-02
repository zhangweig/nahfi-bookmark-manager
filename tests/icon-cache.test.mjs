import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const code = buildSync({
  entryPoints: ['src/utils/icon-cache.ts'],
  bundle: true,
  write: false,
  format: 'esm',
}).outputFiles[0].text;
const load = () =>
  import(
    `data:text/javascript;base64,${Buffer.from(code + `\n//${Math.random()}`).toString('base64')}`
  );

test('discover declared icons and manifests, resolve relative URLs, reject unsafe schemes', async () => {
  const api = await load();
  const links = api.discoverLinks(
    `<link href="/assets/brand.svg" rel="icon"><link rel='apple-touch-icon' href='touch.png'><link rel=manifest href=/app.webmanifest><link rel=icon href="javascript:bad">`,
    'https://example.com/page',
  );
  assert.deepEqual(links.icons, [
    'https://example.com/assets/brand.svg',
    'https://example.com/touch.png',
  ]);
  assert.deepEqual(links.manifests, ['https://example.com/app.webmanifest']);
  assert.ok(api.qualityScore(256, 256, false, false) > api.qualityScore(512, 512, false, true));
});

test('choose actual higher-detail site icon, serialize concurrent cache writes, survive worker restart offline', async () => {
  const store = {};
  globalThis.chrome = {
    runtime: {},
    storage: {
      local: {
        get(key, cb) {
          setTimeout(() => cb(structuredClone({ [key]: store[key] })), 1);
        },
        set(values, cb) {
          setTimeout(() => {
            Object.assign(store, structuredClone(values));
            cb();
          }, 1);
        },
      },
    },
  };
  globalThis.createImageBitmap = async (blob) => {
    const dims = JSON.parse(await blob.text());
    return { ...dims, close() {} };
  };
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const path = new URL(url).pathname;
    if (path === '/')
      return new Response('<link rel="icon" href="/high.png"><link rel="icon" href="/low.png">', {
        headers: { 'content-type': 'text/html' },
      });
    if (path === '/high.png')
      return new Response(JSON.stringify({ width: 256, height: 256 }), {
        headers: { 'content-type': 'image/png' },
      });
    if (path === '/low.png' || path === '/favicon.ico')
      return new Response(JSON.stringify({ width: 16, height: 16 }), {
        headers: { 'content-type': 'image/png' },
      });
    if (url.includes('google.com'))
      return new Response(JSON.stringify({ width: 512, height: 512 }), {
        headers: { 'content-type': 'image/png' },
      });
    return new Response('', { status: 404 });
  };
  const api = await load();
  const [first, second] = await Promise.all([
    api.resolveBestIcon('https://one.example/'),
    api.resolveBestIcon('https://two.example/'),
  ]);
  assert.equal(first.width, 256);
  assert.match(first.source, /high.png/);
  assert.equal(second.width, 256);
  assert.equal(Object.keys(store.nahfi_favicon_cache_v7).length, 2);
  const before = calls;
  const restarted = await load();
  globalThis.fetch = () => {
    throw new Error('offline');
  };
  const cached = await restarted.resolveBestIcon('https://one.example/');
  assert.equal(cached.dataUri, first.dataUri);
  assert.equal(calls, before);
});
