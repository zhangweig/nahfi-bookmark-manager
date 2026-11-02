import type { Settings, MetaStorage, BookmarkNode } from '@/types';

const PREFIX = 'nahfi_quick_';
const SETTINGS = 'nahfi_synced_settings';
const PENDING = 'nahfi_sync_pending';
const STATUS = 'nahfi_sync_status';
export interface SyncStatus {
  error?: string;
  lastSuccess?: number;
}
interface QuickLaunch {
  url: string;
  pinned: boolean;
}
function get(
  area: chrome.storage.StorageArea,
  key: string | null,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const done = (items: Record<string, unknown>) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(items);
    };
    if (key === null) area.get(done);
    else area.get(key, done);
  });
}
function set(area: chrome.storage.StorageArea, values: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) =>
    area.set(values, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    }),
  );
}
function remove(area: chrome.storage.StorageArea, key: string): Promise<void> {
  return new Promise((resolve, reject) =>
    area.remove(key, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    }),
  );
}
let queue: Promise<unknown> = Promise.resolve();

async function keyFor(url: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  return (
    PREFIX + Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
  );
}

// Keep failed writes locally so offline edits can be retried on the next open.
// Serialize read/modify/write operations to avoid losing rapid edits.
export function writeSync(values: Record<string, unknown> = {}): Promise<void> {
  const operation = queue.then(async () => {
    const local = await get(chrome.storage.local, PENDING);
    const pending = { ...(local[PENDING] as Record<string, unknown>), ...values };
    if (!Object.keys(pending).length) return;
    await set(chrome.storage.local, { [PENDING]: pending });
    try {
      await set(chrome.storage.sync, pending);
      await remove(chrome.storage.local, PENDING);
      await set(chrome.storage.local, { [STATUS]: { lastSuccess: Date.now() } });
    } catch (error) {
      await set(chrome.storage.local, {
        [STATUS]: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  });
  queue = operation.catch(() => {});
  return operation;
}

async function readSync(): Promise<{ values: Record<string, unknown>; available: boolean }> {
  await writeSync();
  const local = await get(chrome.storage.local, PENDING);
  try {
    return {
      values: {
        ...(await get(chrome.storage.sync, null)),
        ...(local[PENDING] as Record<string, unknown>),
      },
      available: true,
    };
  } catch (error) {
    await set(chrome.storage.local, { [STATUS]: { error: String(error) } });
    return { values: (local[PENDING] as Record<string, unknown>) ?? {}, available: false };
  }
}

export async function syncQuickLaunch(
  tree: BookmarkNode[],
  meta: MetaStorage,
): Promise<MetaStorage> {
  const { values: remote, available } = await readSync();
  const result = { ...meta };
  const migration: Record<string, QuickLaunch> = {};
  const walk = async (nodes: BookmarkNode[]): Promise<void> => {
    for (const node of nodes) {
      if (node.url) {
        const key = await keyFor(node.url);
        const entry = remote[key] as QuickLaunch | undefined;
        if (entry?.url === node.url && typeof entry.pinned === 'boolean') {
          result[node.id] = {
            ...(result[node.id] ?? { visitCount: 0, lastVisited: null, customTags: [] }),
            pinned: entry.pinned,
          };
        } else if (available && meta[node.id]?.pinned) {
          migration[key] = { url: node.url, pinned: true };
        }
      }
      if (node.children) await walk(node.children);
    }
  };
  await walk(tree);
  if (Object.keys(migration).length) await writeSync(migration);
  return result;
}

export async function saveQuickLaunch(url: string, pinned: boolean): Promise<void> {
  await writeSync({ [await keyFor(url)]: { url, pinned } });
}

export async function readSyncedSettings(): Promise<Partial<Settings>> {
  const value = (await readSync()).values[SETTINGS];
  if (!value || typeof value !== 'object') return {};
  const source = value as Settings;
  const result: Partial<Settings> = {};
  if (['light', 'dark', 'system'].includes(source.theme)) result.theme = source.theme;
  if (['small', 'medium', 'large'].includes(source.cardSize)) result.cardSize = source.cardSize;
  for (const key of ['showUrl', 'showFavicon', 'enableAnimations'] as const) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  return result;
}

export const saveSyncedSettings = (settings: Settings) => writeSync({ [SETTINGS]: settings });
export async function getSyncStatus(): Promise<SyncStatus> {
  return ((await get(chrome.storage.local, STATUS))[STATUS] as SyncStatus) ?? {};
}

export function isSyncChange(changes: Record<string, chrome.storage.StorageChange>): boolean {
  return Object.keys(changes).some((key) => key === SETTINGS || key.startsWith(PREFIX));
}
