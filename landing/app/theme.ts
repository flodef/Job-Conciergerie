'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

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

export function useTheme() {
  // 'system' matches the server render — a store snapshot mismatch during
  // hydration would force React to re-mount the tree (visible layout shift).
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');
  const [ready, setReady] = useState(false);

  // Load the theme the init script restored (data-theme / localStorage) on
  // mount — batched so nothing applies a stale default first.
  useEffect(() => {
    const m = getMode();
    setMode(m);
    setResolved(m === 'system' ? (prefersLight() ? 'light' : 'dark') : m);
    setReady(true);
  }, []);

  // Track the OS theme while in 'system' mode.
  useEffect(() => {
    if (!ready || mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => setResolved(mq.matches ? 'light' : 'dark');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode, ready]);

  // Apply + persist on change (skipped until the stored theme is loaded).
  useEffect(() => {
    if (!ready) return;
    applyTheme(mode);
    if (mode === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', mode);
  }, [mode, resolved, ready]);

  return { mode, resolved, set: setMode, ready };
}
