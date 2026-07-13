import { memo, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

function ConfirmDialogComponent() {
  const { visible, title, message, onConfirm } = useStore((s) => s.confirmDialog);
  const closeConfirmDialog = useStore((s) => s.closeConfirmDialog);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirmDialog();
      if (e.key === 'Enter') {
        onConfirm?.();
        closeConfirmDialog();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onConfirm, closeConfirmDialog]);

  if (!visible) return null;

  const handleConfirm = () => {
    onConfirm?.();
    closeConfirmDialog();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={closeConfirmDialog}
      />

      <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 animate-scale-in">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-black/5 bg-white/90 shadow-2xl backdrop-blur-2xl',
            'dark:border-white/10 dark:bg-gray-900/90',
          )}
        >
          <div className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            </div>
            <p className="ml-13 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
            <button
              onClick={closeConfirmDialog}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export const ConfirmDialog = memo(ConfirmDialogComponent);
