'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // resolvedTheme n'est connu qu'après hydratation côté client (system
  // preference / localStorage) : avant ça, on affiche l'état "off" pour
  // éviter un flash incorrect pendant le rendu serveur.
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          🌙
        </span>
        <div>
          <p className="font-medium text-[#0F1B2D] dark:text-text-main">Mode sombre</p>
          <p className="text-xs text-[#6B7280] dark:text-muted">Réduit la consommation d&apos;énergie</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Activer le mode sombre"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5F7A] focus-visible:ring-offset-2 dark:focus-visible:ring-primary-content',
          isDark ? 'bg-[#2D7D46]' : 'bg-gray-200 dark:bg-divider',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            isDark ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
