import { memo } from 'react';
import { BookmarkX, Pin } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

function EmptyStateComponent() {
  const filter = useStore((s) => s.filter);

  const isPinned = filter === 'pinned';
  const isFiltered = filter !== 'all';

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-3 p-8 text-center',
        'animate-fade-in',
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
        {isPinned ? (
          <Pin className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        ) : (
          <BookmarkX className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {isPinned
            ? 'No pinned bookmarks'
            : isFiltered
              ? 'Nothing to show'
              : 'No bookmarks here yet'}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {isPinned
            ? 'Right-click any bookmark and select Pin to add it here'
            : isFiltered
              ? 'Try a different filter'
              : 'Add bookmarks to this folder to get started'}
        </p>
      </div>
    </div>
  );
}

export const EmptyState = memo(EmptyStateComponent);
