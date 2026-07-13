import { memo, useState, useMemo } from 'react';
import { ChevronRight, Folder as FolderIcon } from 'lucide-react';
import type { BookmarkNode } from '@/types';
import { FOLDER_COLORS } from '@/constants';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

type FolderTreeNode = BookmarkNode & { childFolders: FolderTreeNode[] };

function SidebarComponent() {
  const open = useStore((s) => s.sidebarOpen);
  const allFolders = useStore((s) => s.allFolders);
  const folderMetaMap = useStore((s) => s.folderMetaMap);
  const navigateToFolder = useStore((s) => s.navigateToFolder);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const currentFolderId = useStore((s) => s.currentFolderId);

  // Build folder tree structure for display
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>();

    allFolders.forEach((f) => {
      folderMap.set(f.id, { ...f, childFolders: [] });
    });

    const roots: FolderTreeNode[] = [];

    allFolders.forEach((f) => {
      const node = folderMap.get(f.id)!;
      if (f.parentId && folderMap.has(f.parentId)) {
        folderMap.get(f.parentId)!.childFolders.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [allFolders]);

  if (!open) return null;

  const handleNavigate = (folderId: string) => {
    navigateToFolder(folderId);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm animate-fade-in"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'absolute left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-black/5',
          'bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80',
          'animate-slide-down',
        )}
      >
        {/* Header */}
        <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Folders</h2>
        </div>

        {/* Folder tree */}
        <div className="nahfi-scroll flex-1 overflow-y-auto p-2">
          {folderTree.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              folderMetaMap={folderMetaMap}
              currentFolderId={currentFolderId}
              depth={0}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Recursive Folder Tree Item ─────────────────────────────────

interface FolderTreeItemProps {
  folder: FolderTreeNode;
  folderMetaMap: {
    [id: string]: { customIcon?: string; customColor?: string; customName?: string };
  };
  currentFolderId: string;
  depth: number;
  onNavigate: (id: string) => void;
}

function FolderTreeItem({
  folder,
  folderMetaMap,
  currentFolderId,
  depth,
  onNavigate,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = folderMetaMap[folder.id];
  const color = meta?.customColor || FOLDER_COLORS[0];
  const hasChildren = folder.childFolders?.length > 0;
  const isActive = folder.id === currentFolderId;

  const childFolders = folder.childFolders || [];

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg py-1 transition-colors',
          isActive
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
            : 'text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex-shrink-0 rounded p-0.5"
          >
            <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <button
          onClick={() => onNavigate(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 pr-2"
        >
          {meta?.customIcon ? (
            <span className="text-xs">{meta.customIcon}</span>
          ) : (
            <FolderIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
          )}
          <span className="truncate text-xs">{meta?.customName || folder.title}</span>
        </button>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="animate-fade-in">
          {childFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              folderMetaMap={folderMetaMap}
              currentFolderId={currentFolderId}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const Sidebar = memo(SidebarComponent);
