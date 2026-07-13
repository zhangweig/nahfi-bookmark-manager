import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { Pin } from 'lucide-react';
import type { BookmarkNode, BookmarkMeta, Settings, CardSize } from '@/types';
import {
  getDomain,
  getFaviconChain,
  generateAvatarDataUri,
  getInitial,
} from '@/utils/favicon';
import { cn } from '@/utils/helpers';
import { CARD_SIZES, FAVICON_CACHE_TTL } from '@/constants';
import { useStore } from '@/store/useStore';
import { getInternalDragData, setInternalDragData } from '@/utils/drag';

interface BookmarkCardProps {
  node: BookmarkNode;
  meta?: BookmarkMeta;
  settings: Settings;
  cardSize: CardSize;
}

function BookmarkCardComponent({ node, meta, settings, cardSize }: BookmarkCardProps) {
  // Favicon state: index into the favicon chain.
  // Chain order: 0=Chrome cache → 1=Direct /favicon.ico → 2=DuckDuckGo → 3=Google → 4=Avatar
  const [faviconState, setFaviconState] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const recordVisit = useStore((s) => s.recordVisit);
  const openContextMenu = useStore((s) => s.openContextMenu);
  const moveNode = useStore((s) => s.moveNode);
  const retryCount = useStore((s) => s.faviconRetryMap[node.id] ?? 0);
  const setFaviconCacheEntry = useStore((s) => s.setFaviconCacheEntry);

  // Extract hostname for cache lookup
  const hostname = useMemo(() => {
    try {
      return new URL(node.url ?? '').hostname;
    } catch {
      return '';
    }
  }, [node.url]);

  // Check local favicon cache (from chrome.storage.local, loaded into store on init)
  const cachedFavicon = useStore((s) =>
    hostname ? s.faviconCacheMap[hostname] : undefined,
  );
  const cacheValid = cachedFavicon && Date.now() - cachedFavicon.timestamp < FAVICON_CACHE_TTL;

  // Build the favicon chain once per URL change.
  const faviconChain = useMemo(
    () => getFaviconChain(node.url ?? '', 128),
    [node.url],
  );

  // When retry is triggered from context menu, reset favicon state to try again
  const prevRetryCount = useRef(retryCount);
  if (retryCount !== prevRetryCount.current) {
    prevRetryCount.current = retryCount;
    setFaviconState(0); // Reset to try primary source again
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      recordVisit(node);
    },
    [node, recordVisit],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, node, false);
    },
    [node, openContextMenu],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setInternalDragData(e.dataTransfer, node.id, false);
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
      if (internalDrag && internalDrag.id !== node.id && !internalDrag.isFolder) {
        moveNode(internalDrag.id, node.parentId!, node.index);
      }
    },
    [node, moveNode],
  );

  const showFavicon = settings.showFavicon;
  const showUrl = settings.showUrl;
  const enableAnim = settings.enableAnimations;
  const cardDims = CARD_SIZES[cardSize];

  // App-icon style: rounded square frame, icon fills it,
  // single-line label below constrained to icon width.
  const sizeClasses = {
    small: {
      padding: 'p-1.5',
      iconWrap: 'w-[72px] h-[72px] rounded-2xl',
      titleMaxW: 'max-w-[72px]',
      title: 'text-[11px]',
      gap: 'gap-0.5',
    },
    medium: {
      padding: 'p-2',
      iconWrap: 'w-[84px] h-[84px] rounded-2xl',
      titleMaxW: 'max-w-[84px]',
      title: 'text-xs',
      gap: 'gap-0.5',
    },
    large: {
      padding: 'p-2.5',
      iconWrap: 'w-[108px] h-[108px] rounded-2xl',
      titleMaxW: 'max-w-[108px]',
      title: 'text-sm',
      gap: 'gap-1',
    },
  };
  const sz = sizeClasses[cardSize];

  const titleText = meta?.customName || node.title || 'Untitled';

  // Resolve current favicon source.
  // Priority: local cache → network chain → avatar fallback
  const avatarIndex = faviconChain.length - 1; // last entry is always 'avatar'

  const faviconSrc = cacheValid
    ? cachedFavicon!.dataUri
    : faviconState < avatarIndex
      ? faviconChain[faviconState].url
      : generateAvatarDataUri(getInitial(titleText), titleText);

  // Whether we're showing a cached favicon (no network needed)
  const usingCache = !!cacheValid;

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
        'glass-card group relative flex cursor-pointer flex-col items-center justify-start overflow-hidden rounded-2xl border border-white/45',
        'transition-all duration-200',
        'hover:bg-white/70 hover:shadow-lg hover:shadow-black/10',
        'dark:border-white/10 dark:hover:bg-white/10',
        sz.padding,
        sz.gap,
        isDragOver && 'ring-2 ring-blue-400',
        enableAnim && 'hover:-translate-y-0.5',
      )}
      style={{ height: cardDims.height, width: cardDims.width }}
    >
      {/* Favicon / generated icon */}
      <div
        className={cn(
          'relative flex flex-shrink-0 items-center justify-center overflow-visible',
          sz.iconWrap,
        )}
      >
        {showFavicon && node.url && (usingCache || faviconState < avatarIndex) ? (
          <img
            key={`${node.id}-fav-${usingCache ? 'cache' : faviconState}-${retryCount}`}
            src={faviconSrc}
            alt=""
            className="h-[78%] w-[78%] object-contain drop-shadow-sm"
            onError={() => {
              if (!usingCache) setFaviconState((prev) => prev + 1);
            }}
            onLoad={(e) => {
              // Reject tiny/transparent placeholder images (e.g. 1x1 tracking pixels)
              const image = e.currentTarget;
              if (image.naturalWidth <= 1 && image.naturalHeight <= 1) {
                if (!usingCache) setFaviconState((prev) => prev + 1);
                return;
              }

              // Cache successful favicon from network sources (not cache, not avatar)
              if (!usingCache && hostname) {
                const source = faviconChain[faviconState];
                if (source && source.name !== 'avatar') {
                  // Ask background SW to fetch + cache this favicon as base64
                  chrome.runtime.sendMessage(
                    { type: 'CACHE_FAVICON', url: source.url, hostname },
                    (response) => {
                      if (response?.success && response.dataUri) {
                        setFaviconCacheEntry(hostname, response.dataUri);
                      }
                    },
                  );
                }
              }
            }}
            loading="lazy"
            draggable={false}
          />
        ) : (
          /* First-letter avatar — colorful gradient + white letter */
          <img
            src={generateAvatarDataUri(getInitial(titleText), titleText)}
            alt=""
            className="h-full w-full"
            draggable={false}
          />
        )}

        {/* Pin badge overlay */}
        {meta?.pinned && (
          <div className="absolute right-1 top-1 z-10 rounded-full bg-amber-400 p-0.5 shadow-sm">
            <Pin className={cn('h-2.5 w-2.5 text-white', enableAnim && 'animate-scale-in')} />
          </div>
        )}
      </div>

      {/* Title — single line, width matches icon */}
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

      {showUrl && node.url && (
        <span
          className={cn(
            'block text-center text-[10px] leading-3 text-gray-400 dark:text-gray-500',
            'truncate',
            sz.titleMaxW,
          )}
          title={node.url}
        >
          {getDomain(node.url)}
        </span>
      )}
    </div>
  );
}

export const BookmarkCard = memo(BookmarkCardComponent);
