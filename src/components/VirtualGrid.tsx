import { memo, useMemo, useCallback } from 'react';
import type { BookmarkNode, BookmarkMeta, FolderMeta, Settings, CardSize } from '@/types';
import { CARD_SIZES } from '@/constants';
import { cn } from '@/utils/helpers';
import { useVirtualGrid } from '@/hooks/useVirtualGrid';
import { useStore } from '@/store/useStore';
import { BookmarkCard } from './BookmarkCard';
import { FolderCard } from './FolderCard';

interface VirtualGridProps {
  items: BookmarkNode[];
  metaMap: { [id: string]: BookmarkMeta };
  folderMetaMap: { [id: string]: FolderMeta };
  settings: Settings;
}

function VirtualGridComponent({ items, metaMap, folderMetaMap, settings }: VirtualGridProps) {
  const cardSize = settings.cardSize;
  const { width: itemWidth, height: itemHeight, gap } = CARD_SIZES[cardSize];
  const currentFolderId = useStore((s) => s.currentFolderId);
  const getScrollPosition = useStore((s) => s.getScrollPosition);
  const setScrollPosition = useStore((s) => s.setScrollPosition);

  const initialScrollTop = getScrollPosition(currentFolderId);

  const onScrollTopChange = useCallback(
    (scrollTop: number) => {
      setScrollPosition(currentFolderId, scrollTop);
    },
    [currentFolderId, setScrollPosition],
  );

  const { containerRef, onScroll, totalHeight, visibleItems } = useVirtualGrid({
    itemCount: items.length,
    itemWidth,
    itemHeight,
    gap,
    overscan: 6,
    initialScrollTop,
    onScrollTopChange,
  });

  // Memoize the container style
  const containerStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      scrollbarWidth: 'thin' as const,
    }),
    [],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} onScroll={onScroll} style={containerStyle} className="nahfi-scroll">
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
        }}
      >
        {visibleItems.map(({ index, x, y }) => {
          const node = items[index];
          if (!node) return null;
          const isFolder = !node.url;

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
              }}
              className={cn(settings.enableAnimations && 'animate-fade-in')}
            >
              {isFolder ? (
                <FolderCard
                  node={node}
                  folderMeta={folderMetaMap[node.id]}
                  settings={settings}
                  cardSize={cardSize as CardSize}
                />
              ) : (
                <BookmarkCard
                  node={node}
                  meta={metaMap[node.id]}
                  settings={settings}
                  cardSize={cardSize as CardSize}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualGrid = memo(VirtualGridComponent);
