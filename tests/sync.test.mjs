import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const bundled = buildSync({
  entryPoints: ['src/utils/sync.ts'],
  bundle: true,
  write: false,
  format: 'esm',
}).outputFiles[0].text;

async function fixture() {
  const local = {};
  const remote = {};
  let offline = false;
  let readFailure = false;
  const runtime = {};
  function area(data, isRemote = false) {
    return {
      get(key, callback) {
        if (typeof key === 'function') {
          callback = key;
          key = null;
        }
        if (isRemote && readFailure) runtime.lastError = { message: 'Read unavailable' };
        callback(structuredClone(key === null ? data : { [key]: data[key] }));
        delete runtime.lastError;
      },
      set(values, callback) {
        if (isRemote && offline) runtime.lastError = { message: 'Sync quota or offline' };
        else Object.assign(data, structuredClone(values));
        callback();
        delete runtime.lastError;
      },
      remove(key, callback) {
        delete data[key];
        callback();
      },
    };
  }
  globalThis.chrome = { runtime, storage: { local: area(local), sync: area(remote, true) } };
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(bundled + `\n//${Math.random()}`).toString('base64')}`
  );
  return {
    api,
    local,
    remote,
    offline: (value) => {
      offline = value;
    },
    failRead: (value) => {
      readFailure = value;
    },
  };
}
const node = (id) => [{ id, title: 'Example', url: 'https://example.com/' }];
const meta = (pinned) => ({ pinned, visitCount: 7, lastVisited: 100, customTags: [] });

test('shortcuts follow URLs across different device bookmark IDs; unpin is a tombstone', async () => {
  const { api } = await fixture();
  await api.saveQuickLaunch('https://example.com/', true);
  const imported = await api.syncQuickLaunch(node('device-b'), {});
  assert.equal(imported['device-b'].pinned, true);
  await api.saveQuickLaunch('https://example.com/', false);
  const removed = await api.syncQuickLaunch(node('device-a'), { 'device-a': meta(true) });
  assert.equal(removed['device-a'].pinned, false);
  assert.equal(removed['device-a'].visitCount, 7);
});

test('failed writes survive locally and retry without losing concurrent shortcuts', async () => {
  const { api, local, remote, offline } = await fixture();
  offline(true);
  await Promise.all([
    api.saveQuickLaunch('https://example.com/', true),
    api.saveQuickLaunch('https://second.example/', true),
  ]);
  assert.equal(Object.keys(local.nahfi_sync_pending).length, 2);
  assert.match((await api.getSyncStatus()).error, /offline/);
  assert.equal((await api.syncQuickLaunch(node('offline-id'), {}))['offline-id'].pinned, true);
  offline(false);
  await api.writeSync();
  assert.equal(Object.keys(remote).length, 2);
  assert.equal(local.nahfi_sync_pending, undefined);
  assert.ok((await api.getSyncStatus()).lastSuccess);
});

test('existing local shortcuts migrate without overwriting remote removal', async () => {
  const { api, remote } = await fixture();
  await api.syncQuickLaunch(node('old-id'), { 'old-id': meta(true) });
  assert.equal(Object.values(remote)[0].pinned, true);
  await api.saveQuickLaunch('https://example.com/', false);
  assert.equal(
    (await api.syncQuickLaunch(node('old-id'), { 'old-id': meta(true) }))['old-id'].pinned,
    false,
  );
});

test('settings sync and invalid remote values cannot break layout', async () => {
  const { api, remote } = await fixture();
  await api.saveSyncedSettings({
    theme: 'dark',
    cardSize: 'small',
    showUrl: false,
    showFavicon: true,
    enableAnimations: false,
  });
  assert.equal((await api.readSyncedSettings()).theme, 'dark');
  remote.nahfi_synced_settings = { theme: 'invalid', cardSize: 'huge', showUrl: 'yes' };
  assert.deepEqual(await api.readSyncedSettings(), {});
});

test('a failed cloud read cannot upload stale local pins over a remote removal', async () => {
  const { api, remote, failRead } = await fixture();
  await api.saveQuickLaunch('https://example.com/', false);
  failRead(true);
  await api.syncQuickLaunch(node('old-id'), { 'old-id': meta(true) });
  assert.equal(Object.values(remote)[0].pinned, false);
  failRead(false);
  assert.equal(
    (await api.syncQuickLaunch(node('old-id'), { 'old-id': meta(true) }))['old-id'].pinned,
    false,
  );
});
