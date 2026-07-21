'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const OPTIONS: { value: 'system' | 'light' | 'dark'; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Le thème système/persisté n'est connu qu'après hydratation côté client
  // (localStorage) : afficher "Système" par défaut évite un flash sur une
  // valeur incorrecte pendant le rendu serveur.
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? 'system' : 'system';

  return (
    <div role="group" aria-label="Thème de l'application" className="flex rounded-[8px] overflow-hidden border border-gray-200 dark:border-divider">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => setTheme(value)}
          className={[
            'flex-1 py-2.5 text-sm font-medium transition-colors',
            current === value
              ? 'bg-primary text-white'
              : 'bg-white text-[#6B7280] hover:bg-gray-50 dark:bg-surface dark:text-muted dark:hover:bg-divider/40',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
