import { memo } from 'react';
import { LayoutGrid, Pin, Clock, TrendingUp } from 'lucide-react';
import type { FilterType } from '@/types';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

const FILTERS: { value: FilterType; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'pinned', label: 'Pinned', icon: Pin },
  { value: 'recent', label: 'Recent', icon: Clock },
  { value: 'most-visited', label: 'Top', icon: TrendingUp },
];

function FilterBarComponent() {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const enableAnim = useStore((s) => s.settings.enableAnimations);

  return (
    <div className="flex-shrink-0 flex items-center gap-1 rounded-xl bg-black/5 p-0.5 backdrop-blur-sm dark:bg-white/5">
      {FILTERS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setFilter(value)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
            filter === value
              ? 'bg-white text-gray-800 shadow-sm dark:bg-white/15 dark:text-gray-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            enableAnim && 'active:scale-95',
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

export const FilterBar = memo(FilterBarComponent);
