import { create } from 'zustand';
import type {
  BookmarkNode,
  BookmarkMeta,
  FolderMeta,
  RecentVisit,
  Settings,
  FilterType,
  ContextMenuState,
  EditDialogState,
  ConfirmDialogState,
  MetaStorage,
  FolderMetaStorage,
  FaviconCacheStorage,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/constants';
import * as bookmarkApi from '@/utils/bookmarks';
import * as storage from '@/utils/storage';
import { sortBookmarks } from '@/utils/helpers';

// ─── Store State ────────────────────────────────────────────────

interface StoreState {
  // ── Data ──
  currentFolderId: string;
  folderChildren: BookmarkNode[];
  breadcrumbPath: BookmarkNode[];
  metaMap: MetaStorage;
  folderMetaMap: FolderMetaStorage;
  recentVisits: RecentVisit[];
  allFolders: BookmarkNode[];
  allBookmarks: BookmarkNode[]; // flattened — every bookmark across all folders

  // ── UI ──
  settings: Settings;
  filter: FilterType;
  isLoading: boolean;
  error: string | null;
  contextMenu: ContextMenuState;
  editDialog: EditDialogState;
  confirmDialog: ConfirmDialogState;
  settingsOpen: boolean;
  sidebarOpen: boolean;
  scrollPositionMap: Record<string, number>; // folderId -> scrollTop
  faviconRetryMap: Record<string, number>; // bookmarkId -> retry count
  faviconCacheMap: FaviconCacheStorage; // hostname -> { dataUri, timestamp }

  // ── Actions ──
  init: () => Promise<void>;
  loadFolder: (folderId: string) => Promise<void>;
  navigateToFolder: (folderId: string) => Promise<void>;
  refreshCurrentFolder: () => Promise<void>;
  setFilter: (filter: FilterType) => void;
  setSettings: (settings: Settings) => void;
  togglePin: (bookmarkId: string) => Promise<void>;
  recordVisit: (node: BookmarkNode) => Promise<void>;
  createBookmark: (parentId: string, title: string, url?: string) => Promise<void>;
  createFolder: (parentId: string, title: string) => Promise<string>;
  deleteNode: (id: string) => Promise<void>;
  updateNode: (id: string, changes: { title?: string; url?: string }) => Promise<void>;
  moveNode: (id: string, parentId: string, index?: number) => Promise<void>;
  setFolderCustomMeta: (folderId: string, meta: Partial<FolderMeta>) => Promise<void>;
  openContextMenu: (x: number, y: number, node: BookmarkNode, isFolder: boolean) => void;
  closeContextMenu: () => void;
  openEditDialog: (node: BookmarkNode | null, isFolder: boolean) => void;
  closeEditDialog: () => void;
  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;
  setSettingsOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setScrollPosition: (folderId: string, scrollTop: number) => void;
  getScrollPosition: (folderId: string) => number;
  retryFavicon: (bookmarkId: string) => void;
  setFaviconCacheEntry: (hostname: string, dataUri: string) => void;
  setMetaMap: (metaMap: MetaStorage) => void;
  setFolderMetaMap: (folderMetaMap: FolderMetaStorage) => void;
  setRecentVisits: (recentVisits: RecentVisit[]) => void;
  setAllBookmarks: (allBookmarks: BookmarkNode[]) => void;
  setAllFolders: (allFolders: BookmarkNode[]) => void;
}

// ─── Store Implementation ───────────────────────────────────────

export const useStore = create<StoreState>((set, get) => ({
  // ── Initial Data ──
  currentFolderId: '1',
  folderChildren: [],
  breadcrumbPath: [],
  metaMap: {},
  folderMetaMap: {},
  recentVisits: [],
  allFolders: [],
  allBookmarks: [],

  // ── Initial UI ──
  settings: DEFAULT_SETTINGS,
  filter: 'pinned' as FilterType,
  isLoading: true,
  error: null,
  contextMenu: { visible: false, x: 0, y: 0, target: null, isFolder: false },
  editDialog: { visible: false, node: null, isFolder: false },
  confirmDialog: { visible: false, title: '', message: '', onConfirm: null },
  settingsOpen: false,
  sidebarOpen: false,
  scrollPositionMap: {},
  faviconRetryMap: {},
  faviconCacheMap: {},

  // ── Actions ──

  init: async () => {
    try {
      set({ isLoading: true, error: null });

      const [settings, metaMap, folderMetaMap, recentVisits, lastFolder, tree, faviconCache] = await Promise.all([
        storage.getSettings(),
        storage.getAllMeta(),
        storage.getAllFolderMeta(),
        storage.getRecentVisits(),
        storage.getLastFolder(),
        bookmarkApi.getBookmarkTree(),
        storage.getAllFaviconCache(),
      ]);

      const allFolders = bookmarkApi.collectFolders(tree);
      const allBookmarks = bookmarkApi.flattenBookmarks(tree);

      set({
        settings,
        metaMap,
        folderMetaMap,
        recentVisits,
        allFolders,
        allBookmarks,
        faviconCacheMap: faviconCache,
      });

      await get().loadFolder(lastFolder);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to initialize' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadFolder: async (folderId: string) => {
    try {
      set({ isLoading: true, error: null });

      const [children, path] = await Promise.all([
        bookmarkApi.getBookmarkChildren(folderId),
        bookmarkApi.buildBreadcrumbPath(folderId),
      ]);

      await storage.saveLastFolder(folderId);

      set({
        currentFolderId: folderId,
        folderChildren: children,
        breadcrumbPath: path,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load folder',
        isLoading: false,
      });
    }
  },

  navigateToFolder: async (folderId: string) => {
    await get().loadFolder(folderId);
  },

  refreshCurrentFolder: async () => {
    await get().loadFolder(get().currentFolderId);
  },

  setFilter: (filter: FilterType) => {
    set({ filter });
  },

  setSettings: (newSettings: Settings) => {
    set({ settings: newSettings });
    storage.saveSettings(newSettings);
  },

  togglePin: async (bookmarkId: string) => {
    const current = get().metaMap[bookmarkId] ?? {
      pinned: false,
      visitCount: 0,
      lastVisited: null,
      customTags: [],
    };
    const newMeta: BookmarkMeta = { ...current, pinned: !current.pinned };
    await storage.setMeta(bookmarkId, newMeta);

    set((state) => ({
      metaMap: { ...state.metaMap, [bookmarkId]: newMeta },
    }));
  },

  recordVisit: async (node: BookmarkNode) => {
    if (!node.url) return;

    const current = get().metaMap[node.id] ?? {
      pinned: false,
      visitCount: 0,
      lastVisited: null,
      customTags: [],
    };
    const newMeta: BookmarkMeta = {
      ...current,
      visitCount: current.visitCount + 1,
      lastVisited: Date.now(),
    };
    await storage.setMeta(node.id, newMeta);

    const visit: RecentVisit = {
      id: node.id,
      title: node.title,
      url: node.url,
      timestamp: Date.now(),
    };
    await storage.addRecentVisit(visit);

    const recentVisits = await storage.getRecentVisits();

    set((state) => ({
      metaMap: { ...state.metaMap, [node.id]: newMeta },
      recentVisits,
    }));

    // Open the bookmark in a new tab
    chrome.tabs.create({ url: node.url });
  },

  createBookmark: async (parentId: string, title: string, url?: string) => {
    await bookmarkApi.createBookmark(parentId, title, url);
    await get().refreshCurrentFolder();
    const tree = await bookmarkApi.getBookmarkTree();
    set({
      allFolders: bookmarkApi.collectFolders(tree),
      allBookmarks: bookmarkApi.flattenBookmarks(tree),
    });
  },

  createFolder: async (parentId: string, title: string) => {
    const newFolder = await bookmarkApi.createFolder(parentId, title);
    await get().refreshCurrentFolder();
    const tree = await bookmarkApi.getBookmarkTree();
    set({
      allFolders: bookmarkApi.collectFolders(tree),
      allBookmarks: bookmarkApi.flattenBookmarks(tree),
    });
    return newFolder.id;
  },

  deleteNode: async (id: string) => {
    await bookmarkApi.deleteBookmark(id);
    await storage.removeMeta(id);
    await get().refreshCurrentFolder();
    const tree = await bookmarkApi.getBookmarkTree();
    set({
      allFolders: bookmarkApi.collectFolders(tree),
      allBookmarks: bookmarkApi.flattenBookmarks(tree),
    });
  },

  updateNode: async (id: string, changes: { title?: string; url?: string }) => {
    await bookmarkApi.updateBookmark(id, changes);
    await get().refreshCurrentFolder();
    const tree = await bookmarkApi.getBookmarkTree();
    set({
      allFolders: bookmarkApi.collectFolders(tree),
      allBookmarks: bookmarkApi.flattenBookmarks(tree),
    });
  },

  moveNode: async (id: string, parentId: string, index?: number) => {
    await bookmarkApi.moveBookmark(id, { parentId, index });
    await get().refreshCurrentFolder();
    const tree = await bookmarkApi.getBookmarkTree();
    set({
      allFolders: bookmarkApi.collectFolders(tree),
      allBookmarks: bookmarkApi.flattenBookmarks(tree),
    });
  },

  setFolderCustomMeta: async (folderId: string, meta: Partial<FolderMeta>) => {
    await storage.setFolderMeta(folderId, meta);

    set((state) => ({
      folderMetaMap: {
        ...state.folderMetaMap,
        [folderId]: { ...state.folderMetaMap[folderId], ...meta },
      },
    }));
  },

  openContextMenu: (x: number, y: number, node: BookmarkNode, isFolder: boolean) => {
    set({ contextMenu: { visible: true, x, y, target: node, isFolder } });
  },

  closeContextMenu: () => {
    set((state) => ({ contextMenu: { ...state.contextMenu, visible: false } }));
  },

  openEditDialog: (node: BookmarkNode | null, isFolder: boolean) => {
    set({ editDialog: { visible: true, node, isFolder } });
  },

  closeEditDialog: () => {
    set({ editDialog: { visible: false, node: null, isFolder: false } });
  },

  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => {
    set({ confirmDialog: { visible: true, title, message, onConfirm } });
  },

  closeConfirmDialog: () => {
    set({ confirmDialog: { visible: false, title: '', message: '', onConfirm: null } });
  },

  setSettingsOpen: (open: boolean) => {
    set({ settingsOpen: open });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  setMetaMap: (metaMap: MetaStorage) => {
    set({ metaMap });
  },

  setFolderMetaMap: (folderMetaMap: FolderMetaStorage) => {
    set({ folderMetaMap });
  },

  setRecentVisits: (recentVisits: RecentVisit[]) => {
    set({ recentVisits });
  },

  setAllBookmarks: (allBookmarks: BookmarkNode[]) => {
    set({ allBookmarks });
  },

  setAllFolders: (allFolders: BookmarkNode[]) => {
    set({ allFolders });
  },

  setScrollPosition: (folderId: string, scrollTop: number) => {
    set((state) => ({
      scrollPositionMap: { ...state.scrollPositionMap, [folderId]: scrollTop },
    }));
  },

  getScrollPosition: (folderId: string) => {
    return get().scrollPositionMap[folderId] ?? 0;
  },

  retryFavicon: (bookmarkId: string) => {
    set((state) => ({
      faviconRetryMap: {
        ...state.faviconRetryMap,
        [bookmarkId]: (state.faviconRetryMap[bookmarkId] ?? 0) + 1,
      },
    }));
  },

  setFaviconCacheEntry: (hostname: string, dataUri: string) => {
    set((state) => ({
      faviconCacheMap: {
        ...state.faviconCacheMap,
        [hostname]: { dataUri, timestamp: Date.now() },
      },
    }));
  },
}));

// ─── Selectors ──────────────────────────────────────────────────

export function useSortedChildren() {
  const { folderChildren, metaMap } = useStore();
  return sortBookmarks(folderChildren, metaMap);
}
