// ─── Class name merge (minimal clsx alternative) ────────────────

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Format relative time ───────────────────────────────────────

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Format date ────────────────────────────────────────────────

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Truncate text ──────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

// ─── Clamp value ────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Group array into chunks ────────────────────────────────────

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─── Sort bookmarks: pinned first, then folders, then by name ───

export function sortBookmarks<T extends { id: string; url?: string; title: string }>(
  items: T[],
  metaMap: { [id: string]: { pinned: boolean } },
): T[] {
  return [...items].sort((a, b) => {
    const aPinned = metaMap[a.id]?.pinned ?? false;
    const bPinned = metaMap[b.id]?.pinned ?? false;

    // Pinned first
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    // Folders before bookmarks
    const aIsFolder = !a.url;
    const bIsFolder = !b.url;
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;

    // Alphabetical
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}
