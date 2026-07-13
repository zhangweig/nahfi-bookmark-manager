import { memo } from 'react';
import { X, Sun, Moon, Monitor, Plus, FolderPlus } from 'lucide-react';
import type { CardSize, Settings } from '@/types';
import { cn } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

function SettingsPanelComponent() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const openEditDialog = useStore((s) => s.openEditDialog);

  if (!open) return null;

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleAddBookmark = () => {
    openEditDialog(null, false);
    setOpen(false);
  };

  const handleAddFolder = () => {
    openEditDialog(null, true);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute right-0 top-0 z-40 flex h-full w-72 flex-col border-l border-black/5',
          'bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80',
          'animate-slide-down',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="nahfi-scroll flex-1 space-y-5 overflow-y-auto p-4">
          {/* Add Actions */}
          <SettingSection label="Add New">
            <div className="grid grid-cols-2 gap-1.5">
              <ActionButton icon={Plus} label="Bookmark" onClick={handleAddBookmark} />
              <ActionButton icon={FolderPlus} label="Folder" onClick={handleAddFolder} />
            </div>
          </SettingSection>

          {/* Theme */}
          <SettingSection label="Theme">
            <div className="grid grid-cols-3 gap-1.5">
              <ThemeButton
                active={settings.theme === 'light'}
                onClick={() => updateSetting('theme', 'light')}
                icon={Sun}
                label="Light"
              />
              <ThemeButton
                active={settings.theme === 'dark'}
                onClick={() => updateSetting('theme', 'dark')}
                icon={Moon}
                label="Dark"
              />
              <ThemeButton
                active={settings.theme === 'system'}
                onClick={() => updateSetting('theme', 'system')}
                icon={Monitor}
                label="Auto"
              />
            </div>
          </SettingSection>

          {/* Card Size */}
          <SettingSection label="Card Size">
            <div className="grid grid-cols-3 gap-1.5">
              {(['small', 'medium', 'large'] as CardSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => updateSetting('cardSize', size)}
                  className={cn(
                    'rounded-lg border py-1.5 text-xs font-medium capitalize transition-all',
                    settings.cardSize === size
                      ? 'border-blue-400 bg-blue-500/10 text-blue-500'
                      : 'border-black/5 bg-white/40 text-gray-500 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-gray-400',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </SettingSection>

          {/* Toggles */}
          <SettingSection label="Display">
            <Toggle
              label="Show URL"
              checked={settings.showUrl}
              onChange={(v) => updateSetting('showUrl', v)}
            />
            <Toggle
              label="Show Favicon"
              checked={settings.showFavicon}
              onChange={(v) => updateSetting('showFavicon', v)}
            />
            <Toggle
              label="Animations"
              checked={settings.enableAnimations}
              onChange={(v) => updateSetting('enableAnimations', v)}
            />
          </SettingSection>

          {/* Info */}
          <div className="rounded-xl bg-black/5 p-3 text-center dark:bg-white/5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nahfi Bookmark Manager
              <br />
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Setting Section Wrapper ────────────────────────────────────

function SettingSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── Theme Button ───────────────────────────────────────────────

function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sun;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border py-2 transition-all',
        active
          ? 'border-blue-400 bg-blue-500/10 text-blue-500'
          : 'border-black/5 bg-white/40 text-gray-500 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-gray-400',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// ─── Toggle Switch ──────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative h-5 w-9 rounded-full border transition-colors',
          checked
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

// ─── Action Button (Add Bookmark / Add Folder) ──────────────────

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 transition-all',
        'border-blue-400/40 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
        'dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export const SettingsPanel = memo(SettingsPanelComponent);
