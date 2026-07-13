import { memo, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Copy,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

function ContextMenuComponent() {
  const { visible, x, y, target, isFolder } = useStore((s) => s.contextMenu);
  const closeContextMenu = useStore((s) => s.closeContextMenu);
  const openEditDialog = useStore((s) => s.openEditDialog);
  const togglePin = useStore((s) => s.togglePin);
  const deleteNode = useStore((s) => s.deleteNode);
  const openConfirmDialog = useStore((s) => s.openConfirmDialog);
  const retryFavicon = useStore((s) => s.retryFavicon);
  const metaMap = useStore((s) => s.metaMap);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
  useEffect(() => {
    if (!visible) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [visible, closeContextMenu]);

  if (!visible || !target) return null;

  // Adjust position to keep menu in viewport
  const menuWidth = 180;
  const menuHeight = isFolder ? 200 : 290;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  const isPinned = metaMap[target.id]?.pinned ?? false;

  const handleOpen = () => {
    if (target.url) {
      chrome.tabs.create({ url: target.url });
    }
    closeContextMenu();
  };

  const handleEdit = () => {
    openEditDialog(target, isFolder);
    closeContextMenu();
  };

  const handlePin = async () => {
    if (!isFolder) {
      await togglePin(target.id);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    openConfirmDialog(
      `Delete ${isFolder ? 'folder' : 'bookmark'}`,
      `"${target.title}" will be permanently deleted. This cannot be undone.`,
      async () => {
        await deleteNode(target.id);
      },
    );
    closeContextMenu();
  };

  const handleCopyUrl = async () => {
    if (target.url) {
      await navigator.clipboard.writeText(target.url);
    }
    closeContextMenu();
  };

  const handleOpenAll = () => {
    // For folders — open all bookmarks inside
    if (isFolder && target.children) {
      target.children
        .filter((c) => c.url)
        .forEach((child) => chrome.tabs.create({ url: child.url }));
    }
    closeContextMenu();
  };

  type MenuItem =
    | {
        type: 'item';
        icon: typeof ExternalLink;
        label: string;
        action: () => void;
        danger?: boolean;
        disabled?: boolean;
      }
    | { type: 'divider' };

  const handleRefreshIcon = () => {
    if (!isFolder && target.url) {
      retryFavicon(target.id);
    }
    closeContextMenu();
  };

  const menuItems: MenuItem[] = isFolder
    ? [
        { type: 'item', icon: FolderPlus, label: 'Open all bookmarks', action: handleOpenAll },
        { type: 'divider' },
        { type: 'item', icon: Pencil, label: 'Edit', action: handleEdit },
        { type: 'item', icon: Trash2, label: 'Delete', action: handleDelete, danger: true },
      ]
    : [
        { type: 'item', icon: ExternalLink, label: 'Open in new tab', action: handleOpen },
        { type: 'divider' },
        { type: 'item', icon: RefreshCw, label: 'Refresh icon', action: handleRefreshIcon },
        {
          type: 'item',
          icon: isPinned ? PinOff : Pin,
          label: isPinned ? 'Unpin' : 'Pin',
          action: handlePin,
        },
        { type: 'item', icon: Copy, label: 'Copy URL', action: handleCopyUrl },
        { type: 'item', icon: Pencil, label: 'Edit', action: handleEdit },
        { type: 'divider' },
        { type: 'item', icon: Trash2, label: 'Delete', action: handleDelete, danger: true },
      ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={closeContextMenu} />

      {/* Menu */}
      <div
        ref={menuRef}
        style={{ left: adjustedX, top: adjustedY, width: menuWidth }}
        className={cn(
          'fixed z-50 overflow-hidden rounded-xl border border-black/5 bg-white/80 p-1 shadow-2xl shadow-black/10 backdrop-blur-2xl',
          'dark:border-white/10 dark:bg-gray-900/80',
          'animate-scale-in',
        )}
      >
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} className="my-1 h-px bg-black/5 dark:bg-white/10" />;
          }

          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={item.action}
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                item.danger
                  ? 'text-red-500 hover:bg-red-500/10 dark:text-red-400'
                  : 'text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10',
                item.disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export const ContextMenu = memo(ContextMenuComponent);
