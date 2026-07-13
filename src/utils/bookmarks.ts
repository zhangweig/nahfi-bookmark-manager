import type { BookmarkNode } from '@/types';

// ─── Get full bookmark tree ─────────────────────────────────────

export function getBookmarkTree(): Promise<BookmarkNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      resolve(tree as BookmarkNode[]);
    });
  });
}

// ─── Get children of a specific folder ──────────────────────────

export function getBookmarkChildren(folderId: string): Promise<BookmarkNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getChildren(folderId, (children) => {
      resolve(children as BookmarkNode[]);
    });
  });
}

// ─── Get a specific bookmark node by id ─────────────────────────

export function getBookmarkNode(id: string): Promise<BookmarkNode | null> {
  return new Promise((resolve) => {
    chrome.bookmarks.get(id, (nodes) => {
      if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
        resolve(null);
        return;
      }
      resolve(nodes[0] as BookmarkNode);
    });
  });
}

// ─── Get sub-tree (for breadcrumb path) ─────────────────────────

export function getBookmarkSubTree(id: string): Promise<BookmarkNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getSubTree(id, (subTree) => {
      resolve((subTree ?? []) as BookmarkNode[]);
    });
  });
}

// ─── Create bookmark ────────────────────────────────────────────

export function createBookmark(
  parentId: string,
  title: string,
  url?: string,
): Promise<BookmarkNode> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({ parentId, title, url: url ?? undefined }, (node) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(node as BookmarkNode);
    });
  });
}

// ─── Create folder ──────────────────────────────────────────────

export function createFolder(parentId: string, title: string): Promise<BookmarkNode> {
  return createBookmark(parentId, title);
}

// ─── Delete bookmark / folder ───────────────────────────────────

export function deleteBookmark(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.removeTree(id, () => {
      if (chrome.runtime.lastError) {
        // Try single remove for leaf bookmarks
        chrome.bookmarks.remove(id, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
        return;
      }
      resolve();
    });
  });
}

// ─── Update bookmark ────────────────────────────────────────────

export function updateBookmark(
  id: string,
  changes: { title?: string; url?: string },
): Promise<BookmarkNode> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.update(id, changes, (node) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(node as BookmarkNode);
    });
  });
}

// ─── Move bookmark to a new parent ──────────────────────────────

export function moveBookmark(
  id: string,
  destination: { parentId: string; index?: number },
): Promise<BookmarkNode> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.move(id, destination, (node) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(node as BookmarkNode);
    });
  });
}

// ─── Build breadcrumb path from root to a folder ────────────────

export async function buildBreadcrumbPath(folderId: string): Promise<BookmarkNode[]> {
  const path: BookmarkNode[] = [];
  let currentId = folderId;

  while (currentId) {
    const node = await getBookmarkNode(currentId);
    if (!node) break;
    path.unshift(node);
    if (!node.parentId || node.parentId === '0') break;
    currentId = node.parentId;
  }

  return path;
}

// ─── Flatten bookmark tree (for search results) ─────────────────

export function flattenBookmarks(
  nodes: BookmarkNode[],
  filter?: (node: BookmarkNode) => boolean,
): BookmarkNode[] {
  const result: BookmarkNode[] = [];

  function traverse(node: BookmarkNode) {
    if (node.url) {
      if (!filter || filter(node)) {
        result.push(node);
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return result;
}

// ─── Recursively collect all folder nodes ───────────────────────

export function collectFolders(nodes: BookmarkNode[]): BookmarkNode[] {
  const result: BookmarkNode[] = [];

  function traverse(node: BookmarkNode) {
    if (!node.url && node.id !== '0') {
      result.push(node);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return result;
}

// ─── Check if node is a folder ──────────────────────────────────

export function isFolder(node: BookmarkNode): boolean {
  return !node.url;
}
