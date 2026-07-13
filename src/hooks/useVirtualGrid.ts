import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface VirtualGridOptions {
  itemCount: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
  overscan?: number;
  initialScrollTop?: number;
  onScrollTopChange?: (scrollTop: number) => void;
}

interface VirtualGridResult {
  containerRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  totalHeight: number;
  visibleItems: { index: number; x: number; y: number }[];
  columns: number;
  scrollToIndex: (index: number) => void;
}

// ─── Virtual Grid Hook ──────────────────────────────────────────
// Efficiently renders only visible items in a grid layout.
// Handles 10,000+ items with minimal DOM nodes.
// Supports scroll position persistence across folder navigation.

export function useVirtualGrid({
  itemCount,
  itemWidth,
  itemHeight,
  gap,
  overscan = 4,
  initialScrollTop = 0,
  onScrollTopChange,
}: VirtualGridOptions): VirtualGridResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const initialScrollApplied = useRef(false);

  // Measure container on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setViewportWidth(el.clientWidth);
      setViewportHeight(el.clientHeight);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Restore initial scroll position when container mounts or changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el || initialScrollApplied.current) return;
    if (initialScrollTop > 0) {
      el.scrollTop = initialScrollTop;
      setScrollTop(initialScrollTop);
      initialScrollApplied.current = true;
    }
  }, [initialScrollTop]);

  // Reset scroll restoration flag when item count changes (new folder loaded)
  useEffect(() => {
    initialScrollApplied.current = false;
  }, [itemCount]);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScrollTopChange?.(newScrollTop);
    },
    [onScrollTopChange],
  );

  // Calculate columns based on container width
  const columns = useMemo(() => {
    if (viewportWidth === 0) return 1;
    return Math.max(1, Math.floor((viewportWidth + gap) / (itemWidth + gap)));
  }, [viewportWidth, itemWidth, gap]);

  // Calculate total rows and height
  const rows = useMemo(() => Math.ceil(itemCount / columns), [itemCount, columns]);
  const totalHeight = useMemo(
    () => (rows > 0 ? rows * (itemHeight + gap) - gap : 0),
    [rows, itemHeight, gap],
  );

  // Calculate visible range
  const visibleItems = useMemo(() => {
    if (itemCount === 0 || viewportHeight === 0) return [];

    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      rows - 1,
      Math.ceil((scrollTop + viewportHeight) / (itemHeight + gap)) + overscan,
    );

    const items: { index: number; x: number; y: number }[] = [];

    // Center the grid horizontally within the viewport
    const gridWidth = columns * (itemWidth + gap) - gap;
    const offsetX = Math.max(0, (viewportWidth - gridWidth) / 2);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= itemCount) break;
        items.push({
          index,
          x: col * (itemWidth + gap) + offsetX,
          y: row * (itemHeight + gap),
        });
      }
    }

    return items;
  }, [
    itemCount,
    columns,
    rows,
    scrollTop,
    viewportWidth,
    viewportHeight,
    itemWidth,
    itemHeight,
    gap,
    overscan,
  ]);

  // Scroll to a specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      const row = Math.floor(index / columns);
      el.scrollTo({ top: row * (itemHeight + gap), behavior: 'smooth' });
    },
    [columns, itemHeight, gap],
  );

  return {
    containerRef,
    onScroll,
    totalHeight,
    visibleItems,
    columns,
    scrollToIndex,
  };
}
