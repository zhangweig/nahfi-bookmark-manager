// ─── Background Service Worker ──────────────────────────────────
// Handles extension lifecycle and bookmark change events.
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
    chrome.runtime.sendMessage({ type: 'BOOKMARKS_CHANGED', changeType });
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
});
