// ─── Chrome Bookmark Types ──────────────────────────────────────

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkNode[];
  parentId?: string;
  index?: number;
}

// ─── Storage Types ──────────────────────────────────────────────

export interface BookmarkMeta {
  pinned: boolean;
  visitCount: number;
  lastVisited: number | null;
  customTags: string[];
  customName?: string;
}

export interface FolderMeta {
  customIcon?: string;
  customName?: string;
  customColor?: string;
}

export interface MetaStorage {
  [bookmarkId: string]: BookmarkMeta;
}

export interface FolderMetaStorage {
  [folderId: string]: FolderMeta;
}

export interface RecentVisit {
  id: string;
  title: string;
  url: string;
  timestamp: number;
}

// ─── Settings ───────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';
export type CardSize = 'small' | 'medium' | 'large';

export interface Settings {
  theme: ThemeMode;
  cardSize: CardSize;
  showUrl: boolean;
  showFavicon: boolean;
  enableAnimations: boolean;
}

// ─── UI State ───────────────────────────────────────────────────

export type FilterType = 'all' | 'pinned' | 'recent' | 'most-visited';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: BookmarkNode | null;
  isFolder: boolean;
}

export interface EditDialogState {
  visible: boolean;
  node: BookmarkNode | null;
  isFolder: boolean;
}

export interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

// ─── Favicon Cache ──────────────────────────────────────────────

export interface FaviconCacheEntry {
  dataUri: string; // base64 data URI
  timestamp: number; // when cached (ms epoch)
}

export interface FaviconCacheStorage {
  [hostname: string]: FaviconCacheEntry;
}
