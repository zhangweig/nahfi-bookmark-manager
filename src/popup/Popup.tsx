import { useEffect, useMemo, useCallback, useRef } from 'react';
import { Settings as SettingsIcon, Menu } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { cn, sortBookmarks } from '@/utils/helpers';
import * as bookmarkApi from '@/utils/bookmarks';
import * as storage from '@/utils/storage';
import { getDroppedTitle, getDroppedUrl, getInternalDragData } from '@/utils/drag';

import { FilterBar } from '@/components/FilterBar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { VirtualGrid } from '@/components/VirtualGrid';
import { EmptyState } from '@/components/EmptyState';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ContextMenu } from '@/components/ContextMenu';
import { EditDialog } from '@/components/EditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Sidebar } from '@/components/Sidebar';

export function Popup() {
  const init = useStore((s) => s.init);
  const settings = useStore((s) => s.settings);
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  const filter = useStore((s) => s.filter);
  const metaMap = useStore((s) => s.metaMap);
  const setMetaMap = useStore((s) => s.setMetaMap);
  const folderMetaMap = useStore((s) => s.folderMetaMap);
  const setFolderMetaMap = useStore((s) => s.setFolderMetaMap);
  const recentVisits = useStore((s) => s.recentVisits);
  const setRecentVisits = useStore((s) => s.setRecentVisits);
  const allBookmarks = useStore((s) => s.allBookmarks);
  const setAllBookmarks = useStore((s) => s.setAllBookmarks);
  const setAllFolders = useStore((s) => s.setAllFolders);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const moveNode = useStore((s) => s.moveNode);
  const createBookmark = useStore((s) => s.createBookmark);
  const currentFolderId = useStore((s) => s.currentFolderId);
  const refreshCurrentFolder = useStore((s) => s.refreshCurrentFolder);

  // Apply theme
  useTheme(settings.theme);

  // Initialize on mount
  useEffect(() => {
    init();
  }, [init]);

  // Listen for bookmark changes from background service worker
  useEffect(() => {
    const handler = (message: { type: string; changeType?: string }) => {
      if (message.type === 'BOOKMARKS_CHANGED') {
        // Refresh current folder and global data
        refreshCurrentFolder();
        // Re-fetch all bookmarks for pinned/recent/most-visited filters
        bookmarkApi.getBookmarkTree().then((tree) => {
          setAllFolders(bookmarkApi.collectFolders(tree));
          setAllBookmarks(bookmarkApi.flattenBookmarks(tree));
        });
        // Also refresh meta data (pin toggles etc.)
        storage.getAllMeta().then((meta) => setMetaMap(meta));
        storage.getAllFolderMeta().then((fmeta) => setFolderMetaMap(fmeta));
        storage.getRecentVisits().then((recent) => setRecentVisits(recent));
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [
    refreshCurrentFolder,
    setAllBookmarks,
    setAllFolders,
    setFolderMetaMap,
    setMetaMap,
    setRecentVisits,
  ]);

  // Get sorted children of current folder (for 'all' filter)
  const folderChildren = useStore((s) => s.folderChildren);
  const sortedChildren = useMemo(
    () => sortBookmarks(folderChildren, metaMap),
    [folderChildren, metaMap],
  );

  // Sort all bookmarks (for pinned / recent / most-visited filters)
  const sortedAllBookmarks = useMemo(
    () => sortBookmarks(allBookmarks, metaMap),
    [allBookmarks, metaMap],
  );

  // Compute display items based on filter
  const displayItems = useMemo(() => {
    switch (filter) {
      case 'pinned':
        // Show ALL pinned bookmarks across ALL folders
        return sortedAllBookmarks.filter((node) => node.url && (metaMap[node.id]?.pinned ?? false));

      case 'recent': {
        // Show recently visited bookmarks from ALL folders
        const recentIds = new Set(recentVisits.map((r) => r.id));
        return sortedAllBookmarks.filter((node) => recentIds.has(node.id));
      }

      case 'most-visited':
        // Show most visited bookmarks from ALL folders
        return sortedAllBookmarks
          .filter((node) => node.url)
          .sort((a, b) => {
            const aCount = metaMap[a.id]?.visitCount ?? 0;
            const bCount = metaMap[b.id]?.visitCount ?? 0;
            return bCount - aCount;
          });

      default:
        // 'all' — current folder contents only
        return sortedChildren;
    }
  }, [sortedChildren, sortedAllBookmarks, filter, metaMap, recentVisits]);

  // Handle drag-over at container level (drop into current folder)
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const internalDrag = getInternalDragData(e.dataTransfer);
      if (internalDrag) {
        if (!internalDrag.isFolder) {
          moveNode(internalDrag.id, currentFolderId);
        }
        return;
      }

      const droppedUrl = getDroppedUrl(e.dataTransfer);
      if (droppedUrl) {
        createBookmark(currentFolderId, getDroppedTitle(e.dataTransfer, droppedUrl), droppedUrl);
      }
    },
    [moveNode, createBookmark, currentFolderId],
  );

  // Loading state
  if (isLoading && sortedChildren.length === 0) {
    return (
      <div className="glass-ios flex h-[420px] w-[640px] items-center justify-center rounded-3xl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <p className="text-sm text-gray-400">Loading bookmarks…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-ios flex h-[420px] w-[640px] items-center justify-center rounded-3xl">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => init()}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'glass-ios relative flex h-[420px] w-[640px] flex-col overflow-hidden rounded-3xl bg-white/75',
        'dark:bg-gray-950/80',
      )}
    >
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-white/45 px-3 pt-2.5 pb-2 shadow-sm shadow-black/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'flex-shrink-0 rounded-xl p-2 text-gray-500 transition-colors',
            'hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10',
          )}
          title="Folder tree"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Breadcrumb />

        <FilterBar />

        <button
          onClick={() => setSettingsOpen(true)}
          className={cn(
            'flex-shrink-0 rounded-xl p-2 text-gray-500 transition-colors',
            'hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10',
          )}
          title="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <div
        ref={gridContainerRef}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        className="flex-1 overflow-hidden px-3 pb-3"
      >
        {displayItems.length > 0 ? (
          <VirtualGrid
            items={displayItems}
            metaMap={metaMap}
            folderMetaMap={folderMetaMap}
            settings={settings}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* ── Overlays ────────────────────────────────────── */}
      <Sidebar />
      <SettingsPanel />
      <ContextMenu />
      <EditDialog />
      <ConfirmDialog />
    </div>
  );
}
