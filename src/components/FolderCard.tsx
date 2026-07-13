import { memo, useState, useCallback } from 'react';
import type { BookmarkNode, FolderMeta, Settings, CardSize } from '@/types';
import { CARD_SIZES } from '@/constants';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';
import {
  getDroppedTitle,
  getDroppedUrl,
  getInternalDragData,
  setInternalDragData,
} from '@/utils/drag';

interface FolderCardProps {
  node: BookmarkNode;
  folderMeta?: FolderMeta;
  settings: Settings;
  cardSize: CardSize;
}

function FolderCardComponent({ node, folderMeta, settings, cardSize }: FolderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const navigateToFolder = useStore((s) => s.navigateToFolder);
  const openContextMenu = useStore((s) => s.openContextMenu);
  const moveNode = useStore((s) => s.moveNode);
  const createBookmark = useStore((s) => s.createBookmark);

  const handleClick = useCallback(() => {
    navigateToFolder(node.id);
  }, [node.id, navigateToFolder]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, node, true);
    },
    [node, openContextMenu],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setInternalDragData(e.dataTransfer, node.id, true);
      e.dataTransfer.effectAllowed = 'move';
    },
    [node.id],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const internalDrag = getInternalDragData(e.dataTransfer);
      if (internalDrag) {
        if (internalDrag.id !== node.id && !internalDrag.isFolder) {
          moveNode(internalDrag.id, node.id);
        }
        return;
      }

      const droppedUrl = getDroppedUrl(e.dataTransfer);
      if (droppedUrl) {
        createBookmark(node.id, getDroppedTitle(e.dataTransfer, droppedUrl), droppedUrl);
      }
    },
    [node.id, moveNode, createBookmark],
  );

  const enableAnim = settings.enableAnimations;
  const titleText = folderMeta?.customName || node.title || 'Unnamed';
  const cardDims = CARD_SIZES[cardSize];

  const sizeClasses = {
    small: {
      emojiSize: 'text-[62px]',
      titleMaxW: 'max-w-[96px]',
      title: 'text-[11px]',
      gap: 'gap-1',
    },
    medium: {
      emojiSize: 'text-[74px]',
      titleMaxW: 'max-w-[116px]',
      title: 'text-xs',
      gap: 'gap-1',
    },
    large: {
      emojiSize: 'text-[96px]',
      titleMaxW: 'max-w-[146px]',
      title: 'text-sm',
      gap: 'gap-1.5',
    },
  };
  const sz = sizeClasses[cardSize];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-start',
        'transition-all duration-200',
        sz.gap,
        enableAnim && 'hover:-translate-y-0.5',
      )}
      style={{ height: cardDims.height, width: cardDims.width }}
    >
      <div
        className={cn(
          'glass-card flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/45',
          'transition-all duration-200 group-hover:bg-white/70 group-hover:shadow-lg group-hover:shadow-black/10',
          'dark:border-white/10 dark:group-hover:bg-white/10',
          isDragOver && 'ring-2 ring-blue-400',
        )}
        style={{ height: cardDims.width, width: cardDims.width }}
      >
        <span className={cn('leading-none drop-shadow-sm', sz.emojiSize)}>
          {folderMeta?.customIcon || '📁'}
        </span>
      </div>

      <span
        className={cn(
          sz.title,
          'block text-center font-medium text-gray-700 dark:text-gray-200',
          'truncate',
          sz.titleMaxW,
        )}
        title={titleText}
      >
        {titleText}
      </span>
    </div>
  );
}

export const FolderCard = memo(FolderCardComponent);
