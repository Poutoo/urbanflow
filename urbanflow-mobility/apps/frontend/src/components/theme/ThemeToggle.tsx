'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Icon } from '@iconify/react';
import { useProfileMutation } from '@/hooks/useProfileMutation';
import type { ThemeMode } from '@urbanflow/types';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Clair', icon: 'ph:sun' },
  { value: 'dark', label: 'Sombre', icon: 'ph:moon' },
  { value: 'system', label: 'Système', icon: 'ph:desktop' },
];

/**
 * Le thème local (next-themes/localStorage) reste la source de vérité pour
 * l'affichage — il fonctionne hors-ligne. Le backend n'est utilisé que pour
 * synchroniser le choix entre appareils : lu une fois au montage, écrit en
 * best-effort à chaque changement (jamais bloquant pour l'UI).
 */
export function ThemeToggle({ backendThemeMode }: { backendThemeMode?: ThemeMode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const persist = useProfileMutation();
  const syncedFromBackend = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (syncedFromBackend.current || !backendThemeMode || !mounted) return;
    syncedFromBackend.current = true;
    if (backendThemeMode !== theme) setTheme(backendThemeMode);
    // Ne dépend pas de `theme` : ne doit s'exécuter qu'une fois, à la première
    // valeur backend disponible, pas à chaque changement local ultérieur.
  }, [backendThemeMode, mounted]);

  const current: ThemeMode = mounted ? ((theme as ThemeMode | undefined) ?? 'system') : 'system';

  function select(mode: ThemeMode) {
    setTheme(mode);
    void persist({ themeMode: mode });
  }

  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center gap-3">
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
      <div
        role="radiogroup"
        aria-label="Thème de l'application"
        className="flex rounded-[8px] overflow-hidden border border-gray-200 dark:border-divider"
      >
        {THEME_OPTIONS.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={current === value}
            onClick={() => select(value)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
              current === value
                ? 'bg-[#1A5F7A] text-white'
                : 'bg-white text-[#6B7280] hover:bg-gray-50 dark:bg-surface dark:text-muted dark:hover:bg-divider/40',
            ].join(' ')}
          >
            <Icon icon={icon} width={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
