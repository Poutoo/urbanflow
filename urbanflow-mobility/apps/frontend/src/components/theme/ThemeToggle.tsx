'use client';

import { useTheme } from 'next-themes';
import { Icon } from '@iconify/react';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const isDark = useIsDarkMode();

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-[#B85C00] dark:bg-divider/60 dark:text-accent-content"
          aria-hidden="true"
        >
          <Icon icon="ph:moon" width={18} />
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
