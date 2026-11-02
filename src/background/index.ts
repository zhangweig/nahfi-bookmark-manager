// ─── Background Service Worker ──────────────────────────────────
// Handles extension lifecycle, bookmark change events, and favicon caching.
// Notifies popup when bookmarks change so it can refresh in real-time.

import { readIconCache, resolveBestIcon, ICON_VERSION } from '@/utils/icon-cache';

// On install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Nahfi] Bookmark Manager installed.');
  }
});

// Notify popup when bookmarks change
function notifyPopup(changeType: string) {
  try {
    chrome.runtime.sendMessage({ type: 'BOOKMARKS_CHANGED', changeType }, () => {
      // Ignore lastError when popup is not open
      if (chrome.runtime.lastError) {
        // No-op — this is expected when the popup is closed
      }
    });
  } catch {
    // Popup not open — ignore
  }
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('[Nahfi] Bookmark created:', id, bookmark.title);
  notifyPopup('created');
});

chrome.bookmarks.onRemoved.addListener((id, _removeInfo) => {
  console.log('[Nahfi] Bookmark removed:', id);
  notifyPopup('removed');
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('[Nahfi] Bookmark changed:', id, changeInfo.title);
  notifyPopup('changed');
});

chrome.bookmarks.onMoved.addListener((id, _moveInfo) => {
  console.log('[Nahfi] Bookmark moved:', id);
  notifyPopup('moved');
});

// Warm the persistent cache after installation, updates and browser startup.
// Two sites at a time; cached sites do not issue network requests.
let warming = false;
async function warmIcons() {
  if (warming) return;
  warming = true;
  try {
    const tree = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) =>
      chrome.bookmarks.getTree(resolve),
    );
    const cache = await readIconCache();
    const urls = new Map<string, string>();
    const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[]) =>
      nodes.forEach((node) => {
        if (node.url) {
          try {
            const url = new URL(node.url);
            if (
              ['http:', 'https:'].includes(url.protocol) &&
              cache[url.hostname]?.qualityVersion !== ICON_VERSION
            )
              urls.set(url.hostname, node.url);
          } catch {
            /* Ignore non-web bookmarks. */
          }
        }
        if (node.children) walk(node.children);
      });
    walk(tree);
    const pending = [...urls.values()];
    for (let index = 0; index < pending.length; index += 2)
      await Promise.allSettled(pending.slice(index, index + 2).map((url) => resolveBestIcon(url)));
  } finally {
    warming = false;
  }
}
chrome.runtime.onInstalled.addListener(() => {
  void warmIcons().catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  void warmIcons().catch(console.error);
});
chrome.bookmarks.onCreated.addListener((_id, bookmark) => {
  if (bookmark.url) void resolveBestIcon(bookmark.url).catch(console.error);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_BOOKMARK_COUNT') {
    chrome.bookmarks.getTree((tree) => {
      let count = 0;
      const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        nodes.forEach((n) => {
          if (n.url) count++;
          if (n.children) traverse(n.children);
        });
      };
      traverse(tree);
      sendResponse({ count });
    });
    return true; // async response
  }

  if (message.type === 'RESOLVE_FAVICON') {
    resolveBestIcon(String(message.pageUrl), message.force === true)
      .then((entry) => sendResponse({ success: !!entry, entry }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});
