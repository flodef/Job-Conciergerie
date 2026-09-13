'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

const prefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches;

const getMode = (): ThemeMode => {
  const m = document.documentElement.dataset.theme;
  return m === 'light' || m === 'dark' ? m : 'system';
};

export function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'system' ? (prefersLight() ? 'light' : 'dark') : mode;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle('light', resolved === 'light');
  root.style.colorScheme = resolved;
}

export function setTheme(mode: ThemeMode) {
  if (mode === 'system') localStorage.removeItem('theme');
  else localStorage.setItem('theme', mode);
  applyTheme(mode);
  notify();
}

export function useTheme() {
  const mode = useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getMode,
    () => 'system' as ThemeMode,
  );
  const systemLight = useSyncExternalStore(
    cb => {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    prefersLight,
    () => false,
  );
  const resolved = mode === 'system' ? (systemLight ? 'light' : 'dark') : mode;

  // Re-apply on mode change and on OS theme change while in 'system' mode
  useEffect(() => {
    applyTheme(mode);
  }, [mode, resolved]);

  return { mode, resolved, set: setTheme };
}
