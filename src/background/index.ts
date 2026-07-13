// ─── Background Service Worker ──────────────────────────────────
// Handles extension lifecycle, bookmark change events, and favicon caching.
// Notifies popup when bookmarks change so it can refresh in real-time.

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

// ─── Favicon Caching ────────────────────────────────────────────

/**
 * Fetch an image URL, convert to base64 data URI, and store in chrome.storage.local.
 * Called by popup when a favicon loads successfully from a network source.
 */
async function fetchAndCacheFavicon(url: string, hostname: string): Promise<{ success: boolean; dataUri?: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false };

    const blob = await response.blob();
    // Skip if not an image or too small (likely a placeholder)
    if (!blob.type.startsWith('image/') && blob.size < 100) return { success: false };

    const dataUri = await blobToDataUri(blob);

    // Store in chrome.storage.local using the shared cache key constant.
    // This key was bumped to v2 to invalidate old low-res cached favicons.
    const CACHE_KEY = 'nahfi_favicon_cache_v2';
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get(CACHE_KEY, (items) => {
        resolve(items as Record<string, unknown>);
      });
    });
    const cache = (result[CACHE_KEY] as Record<string, { dataUri: string; timestamp: number }>) ?? {};
    cache[hostname] = { dataUri, timestamp: Date.now() };
    await chrome.storage.local.set({ [CACHE_KEY]: cache });

    return { success: true, dataUri };
  } catch (err) {
    console.warn('[Nahfi] Favicon cache failed for', hostname, err);
    return { success: false };
  }
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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

  if (message.type === 'CACHE_FAVICON') {
    fetchAndCacheFavicon(message.url as string, message.hostname as string)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ success: false }));
    return true; // async response
  }
});
