import { memo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { BookmarkNode } from '@/types';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';
import { BOOKMARK_BAR_ID } from '@/constants';

function BreadcrumbComponent() {
  const breadcrumbPath = useStore((s) => s.breadcrumbPath);
  const navigateToFolder = useStore((s) => s.navigateToFolder);
  const enableAnim = useStore((s) => s.settings.enableAnimations);

  // Build display path — skip the root node (id: '0')
  const displayPath = breadcrumbPath.filter((n) => n.id !== '0');

  return (
    <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1 py-1 text-sm scrollbar-none">
      <button
        onClick={() => navigateToFolder(BOOKMARK_BAR_ID)}
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 text-gray-500 transition-colors',
          'hover:bg-black/5 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200',
        )}
      >
        <Home className="h-3.5 w-3.5" />
      </button>

      {displayPath.map((node: BookmarkNode, index: number) => {
        const isLast = index === displayPath.length - 1;
        return (
          <div key={node.id} className="flex items-center gap-0.5">
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-gray-300 dark:text-gray-600" />
            <button
              onClick={() => !isLast && navigateToFolder(node.id)}
              disabled={isLast}
              className={cn(
                'max-w-[140px] truncate rounded-lg px-2 py-1 transition-colors',
                isLast
                  ? 'font-medium text-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:bg-black/5 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200',
                enableAnim && !isLast && 'active:scale-95',
              )}
            >
              {node.title}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export const Breadcrumb = memo(BreadcrumbComponent);
