import type {
  BookmarkMeta,
  FolderMeta,
  RecentVisit,
  Settings,
  MetaStorage,
  FolderMetaStorage,
  FaviconCacheStorage,
  FaviconCacheEntry,
} from '@/types';
import { STORAGE_KEYS, DEFAULT_SETTINGS, MAX_RECENT_ITEMS, FAVICON_CACHE_TTL } from '@/constants';

// ─── Generic typed storage helpers ──────────────────────────────

function getFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? defaultValue);
    });
  });
}

function setToStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

// ─── Bookmark Meta ──────────────────────────────────────────────

export async function getAllMeta(): Promise<MetaStorage> {
  return getFromStorage<MetaStorage>(STORAGE_KEYS.META, {});
}

export async function getMeta(bookmarkId: string): Promise<BookmarkMeta> {
  const all = await getAllMeta();
  return (
    all[bookmarkId] ?? {
      pinned: false,
      visitCount: 0,
      lastVisited: null,
      customTags: [],
    }
  );
}

export async function setMeta(bookmarkId: string, meta: Partial<BookmarkMeta>): Promise<void> {
  const all = await getAllMeta();
  const existing = all[bookmarkId] ?? {
    pinned: false,
    visitCount: 0,
    lastVisited: null,
    customTags: [],
  };
  all[bookmarkId] = { ...existing, ...meta };
  await setToStorage(STORAGE_KEYS.META, all);
}

export async function updateMeta(
  bookmarkId: string,
  updater: (meta: BookmarkMeta) => BookmarkMeta,
): Promise<void> {
  const all = await getAllMeta();
  const existing = all[bookmarkId] ?? {
    pinned: false,
    visitCount: 0,
    lastVisited: null,
    customTags: [],
  };
  all[bookmarkId] = updater(existing);
  await setToStorage(STORAGE_KEYS.META, all);
}

export async function removeMeta(bookmarkId: string): Promise<void> {
  const all = await getAllMeta();
  delete all[bookmarkId];
  await setToStorage(STORAGE_KEYS.META, all);
}

// ─── Folder Meta ────────────────────────────────────────────────

export async function getAllFolderMeta(): Promise<FolderMetaStorage> {
  return getFromStorage<FolderMetaStorage>(STORAGE_KEYS.FOLDER_META, {});
}

export async function getFolderMeta(folderId: string): Promise<FolderMeta> {
  const all = await getAllFolderMeta();
  return all[folderId] ?? {};
}

export async function setFolderMeta(folderId: string, meta: Partial<FolderMeta>): Promise<void> {
  const all = await getAllFolderMeta();
  const existing = all[folderId] ?? {};
  all[folderId] = { ...existing, ...meta };
  await setToStorage(STORAGE_KEYS.FOLDER_META, all);
}

export async function removeFolderMeta(folderId: string): Promise<void> {
  const all = await getAllFolderMeta();
  delete all[folderId];
  await setToStorage(STORAGE_KEYS.FOLDER_META, all);
}

// ─── Recent Visits ──────────────────────────────────────────────

export async function getRecentVisits(): Promise<RecentVisit[]> {
  return getFromStorage<RecentVisit[]>(STORAGE_KEYS.RECENT, []);
}

export async function addRecentVisit(visit: RecentVisit): Promise<void> {
  const recent = await getRecentVisits();
  // Remove duplicate (same bookmark id)
  const filtered = recent.filter((r) => r.id !== visit.id);
  // Prepend new visit
  filtered.unshift(visit);
  // Trim to max
  const trimmed = filtered.slice(0, MAX_RECENT_ITEMS);
  await setToStorage(STORAGE_KEYS.RECENT, trimmed);
}

// ─── Settings ───────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  return getFromStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// ─── Last Folder ────────────────────────────────────────────────

export async function getLastFolder(): Promise<string> {
  return getFromStorage<string>(STORAGE_KEYS.LAST_FOLDER, '1');
}

export async function saveLastFolder(folderId: string): Promise<void> {
  await setToStorage(STORAGE_KEYS.LAST_FOLDER, folderId);
}

// ─── Favicon Cache ──────────────────────────────────────────────

export async function getAllFaviconCache(): Promise<FaviconCacheStorage> {
  return getFromStorage<FaviconCacheStorage>(STORAGE_KEYS.FAVICON_CACHE, {});
}

export async function setFaviconCacheEntry(hostname: string, dataUri: string): Promise<void> {
  const all = await getAllFaviconCache();
  all[hostname] = { dataUri, timestamp: Date.now() };
  await setToStorage(STORAGE_KEYS.FAVICON_CACHE, all);
}

export async function getFaviconCacheEntry(hostname: string): Promise<FaviconCacheEntry | null> {
  const all = await getAllFaviconCache();
  const entry = all[hostname];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > FAVICON_CACHE_TTL) {
    return null; // expired
  }
  return entry;
}

export async function clearExpiredFaviconCache(): Promise<void> {
  const all = await getAllFaviconCache();
  const now = Date.now();
  let changed = false;
  for (const hostname of Object.keys(all)) {
    if (now - all[hostname].timestamp > FAVICON_CACHE_TTL) {
      delete all[hostname];
      changed = true;
    }
  }
  if (changed) {
    await setToStorage(STORAGE_KEYS.FAVICON_CACHE, all);
  }
}

export async function clearAllFaviconCache(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.FAVICON_CACHE);
}

// Clean up old version caches (v1-v5) to free storage space
export async function cleanupOldFaviconCaches(): Promise<void> {
  const oldKeys = [
    'nahfi_favicon_cache',
    'nahfi_favicon_cache_v2',
    'nahfi_favicon_cache_v3',
    'nahfi_favicon_cache_v4',
    'nahfi_favicon_cache_v5',
  ];
  await chrome.storage.local.remove(oldKeys);
}
