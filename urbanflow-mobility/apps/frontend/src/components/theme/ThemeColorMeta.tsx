'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const THEME_COLOR = {
  light: '#1A5F7A',
  dark: '#0B1622',
} as const;

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEME_COLOR[resolvedTheme === 'dark' ? 'dark' : 'light']);
  }, [resolvedTheme]);

  return null;
}
