import { useEffect, useCallback } from 'react';
import type { ThemeMode } from '@/types';

// ─── Detect system color scheme ─────────────────────────────────

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ─── Apply theme to document root ───────────────────────────────

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const resolved = mode === 'system' ? getSystemTheme() : mode;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ─── Hook: useTheme ─────────────────────────────────────────────

export function useTheme(mode: ThemeMode) {
  const update = useCallback(() => applyTheme(mode), [mode]);

  useEffect(() => {
    update();

    // Listen for system theme changes when in "system" mode
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [mode, update]);
}
