import type { Settings } from '@/types';

// ─── Storage Keys ───────────────────────────────────────────────

export const STORAGE_KEYS = {
  META: 'nahfi_bookmark_meta',
  FOLDER_META: 'nahfi_folder_meta',
  RECENT: 'nahfi_recent_visits',
  SETTINGS: 'nahfi_settings',
  LAST_FOLDER: 'nahfi_last_folder',
  // v3: cache key bumped to invalidate v2 entries that may have cached
  // low-res 16×16 favicons from Chrome's internal cache (which was
  // position 0 in v2's chain). The new chain tries apple-touch-icon
  // (180px) first and rejects images < 32px via onLoad threshold,
  // so all new cache entries are HD.
  FAVICON_CACHE: 'nahfi_favicon_cache_v3',
} as const;

// ─── Favicon Cache TTL ──────────────────────────────────────────

// Cache entries expire after 7 days. On read, expired entries are
// treated as misses and re-fetched from network sources.
export const FAVICON_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Default Settings ───────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  cardSize: 'medium',
  showUrl: true,
  showFavicon: true,
  enableAnimations: true,
};

// ─── Card Dimensions by Size ────────────────────────────────────
// App-icon grid: square-ish cards, icon fills a rounded square frame,
// label below. Popup is 640px wide with px-3 (24px) padding.
// Heights are calculated to fit: padding + icon frame + gap + text line.
// - small:  6 columns (6*96  + 5*6  = 606)
// - medium: 5 columns (5*116 + 4*8  = 612)
// - large:  4 columns (4*146 + 3*10 = 614)

export const CARD_SIZES = {
  small: { width: 96, height: 124, gap: 6 },
  medium: { width: 116, height: 154, gap: 8 },
  large: { width: 146, height: 192, gap: 10 },
} as const;

// ─── Max Recent Items ───────────────────────────────────────────

export const MAX_RECENT_ITEMS = 50;

// ─── Root Bookmark Folder IDs ───────────────────────────────────

// Chrome's bookmark tree has two root folders
export const BOOKMARK_BAR_ID = '1';
export const OTHER_BOOKMARKS_ID = '2';

// ─── Folder Icon Presets ────────────────────────────────────────
// Categorized emoji for folder icons — organized by semantic group.

export const FOLDER_ICON_GROUPS = [
  {
    label: '常用',
    icons: ['📁', '📂', '📌', '⭐', '❤️', '🔥', '🚀', '💡', '✨', '🎯'],
  },
  {
    label: '工作',
    icons: ['💼', '📊', '📈', '🗂️', '📋', '✏️', '🔧', '🛠️', '⚙️', '🖥️'],
  },
  {
    label: '学习',
    icons: ['📚', '📖', '🎓', '🏫', '🧠', '🔬', '📝', '✍️', '💡', '🔭'],
  },
  {
    label: '创意',
    icons: ['🎨', '🖌️', '🎭', '🎵', '🎶', '🎬', '📸', '📷', '🎨', '✏️'],
  },
  {
    label: '科技',
    icons: ['💻', '📱', '🌐', '🔌', '⚡', '🤖', '🧪', '🗄️', '🔒', '☁️'],
  },
  {
    label: '生活',
    icons: ['🏠', '🛒', '🍳', '🍎', '☕', '🎮', '⚽', '🏆', '🚗', '✈️'],
  },
  {
    label: '社交',
    icons: ['💬', '👥', '👋', '🤝', '📣', '🔔', '💌', '🌍', '🇨🇳', '🧑'],
  },
  {
    label: '自然',
    icons: ['🌿', '🌸', '🌊', '☀️', '🌙', '⭐', '🌈', '🦊', '🐱', '🐾'],
  },
] as const;

// Flat list for quick lookup
export const FOLDER_ICONS = FOLDER_ICON_GROUPS.flatMap(
  (g) => g.icons,
) as unknown as readonly string[];

export const FOLDER_COLORS = [
  '#007AFF',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#A2845E',
  '#8E8E93',
] as const;
