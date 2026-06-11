/**
 * Theme system — light / dark / system.
 *
 * - State is stored in localStorage under `nexys.theme`.
 * - `system` reads `prefers-color-scheme` and reacts to changes.
 * - The applied theme is written to `<html data-theme="...">` which drives
 *   the CSS variable swap defined in app/globals.css.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'nexys.theme';

function readStored(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

function systemPref(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemPref() : mode;
}

function applyDom(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  // initial sync after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const m = readStored();
    const r = resolve(m);
    setModeState(m);
    setResolved(r);
    applyDom(r);
  }, []);

  // react to system pref changes while mode === 'system'
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const r: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolved(r);
      applyDom(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
    const r = resolve(m);
    setModeState(m);
    setResolved(r);
    applyDom(r);
  }, []);

  return { mode, resolved, setMode };
}

/**
 * Inline script for app/layout.tsx — applies the saved theme before React
 * hydrates so the page doesn't flash dark→light. Returns a stringified IIFE
 * safe to embed in <script dangerouslySetInnerHTML>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}');var r;if(m==='light'||m==='dark'){r=m;}else{r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
