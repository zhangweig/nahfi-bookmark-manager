import { memo, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';
import { FOLDER_ICON_GROUPS } from '@/constants';

function EditDialogComponent() {
  const { visible, node, isFolder } = useStore((s) => s.editDialog);
  const closeEditDialog = useStore((s) => s.closeEditDialog);
  const updateNode = useStore((s) => s.updateNode);
  const createBookmark = useStore((s) => s.createBookmark);
  const createFolder = useStore((s) => s.createFolder);
  const setFolderCustomMeta = useStore((s) => s.setFolderCustomMeta);
  const folderMetaMap = useStore((s) => s.folderMetaMap);
  const currentFolderId = useStore((s) => s.currentFolderId);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [customIcon, setCustomIcon] = useState('📁');
  const [mode, setMode] = useState<'edit' | 'create'>('edit');

  useEffect(() => {
    if (visible && node) {
      setTitle(node.title || '');
      setUrl(node.url || '');
      setCustomIcon(folderMetaMap[node.id]?.customIcon || '📁');
      setMode('edit');
    } else if (visible && !node) {
      setTitle('');
      setUrl('');
      setCustomIcon('📁');
      setMode('create');
    }
  }, [visible, node, folderMetaMap]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    if (mode === 'edit' && node) {
      await updateNode(node.id, { title: title.trim(), url: isFolder ? undefined : url.trim() });
      if (isFolder) {
        await setFolderCustomMeta(node.id, { customIcon });
      }
    } else if (mode === 'create') {
      if (isFolder) {
        const newFolderId = await createFolder(currentFolderId, title.trim());
        if (newFolderId) {
          await setFolderCustomMeta(newFolderId, { customIcon });
        }
      } else {
        await createBookmark(currentFolderId, title.trim(), url.trim());
      }
    }
    closeEditDialog();
  }, [
    mode,
    node,
    title,
    url,
    isFolder,
    customIcon,
    updateNode,
    createBookmark,
    createFolder,
    setFolderCustomMeta,
    currentFolderId,
    closeEditDialog,
  ]);

  // Handle Enter key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        closeEditDialog();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, handleSave, closeEditDialog]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={closeEditDialog}
      />

      {/* Dialog: max height limited to fit popup, scrollable body */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[340px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 animate-scale-in">
        <div
          className={cn(
            'flex max-h-[calc(420px-32px)] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white/90 shadow-2xl backdrop-blur-2xl',
            'dark:border-white/10 dark:bg-gray-900/90',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {mode === 'edit' ? 'Edit' : 'New'} {isFolder ? 'Folder' : 'Bookmark'}
            </h2>
            <button
              onClick={closeEditDialog}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form: scrollable if content overflows */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {isFolder ? 'Folder Name' : 'Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className={cn(
                  'w-full rounded-lg border border-black/5 bg-white/50 px-3 py-2 text-sm text-gray-800',
                  'focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20',
                  'dark:border-white/10 dark:bg-white/5 dark:text-gray-100',
                )}
                placeholder={isFolder ? 'My Folder' : 'Bookmark title'}
              />
            </div>

            {!isFolder && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-black/5 bg-white/50 px-3 py-2 text-sm text-gray-800',
                    'focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20',
                    'dark:border-white/10 dark:bg-white/5 dark:text-gray-100',
                  )}
                  placeholder="https://example.com"
                />
              </div>
            )}

            {isFolder && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Folder Icon
                  </label>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/5 text-base dark:bg-white/10">
                    {customIcon}
                  </span>
                </div>
                <div className="space-y-2 rounded-xl border border-black/5 bg-black/[0.02] p-2 dark:border-white/10 dark:bg-white/5">
                  {FOLDER_ICON_GROUPS.map((group) => (
                    <div key={group.label}>
                      <span className="mb-1 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {group.label}
                      </span>
                      <div className="grid grid-cols-8 gap-1.5">
                        {group.icons.map((icon, idx) => (
                          <button
                            key={`${group.label}-${idx}`}
                            type="button"
                            onClick={() => setCustomIcon(icon)}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none transition-all',
                              customIcon === icon
                                ? 'bg-blue-500 shadow-sm ring-1 ring-blue-400'
                                : 'hover:bg-black/5 dark:hover:bg-white/10',
                            )}
                            title={icon}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
            <button
              onClick={closeEditDialog}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === 'edit' ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export const EditDialog = memo(EditDialogComponent);
