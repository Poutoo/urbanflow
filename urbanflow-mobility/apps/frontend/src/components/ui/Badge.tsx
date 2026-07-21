'use client';

import type { TransportMode } from '@urbanflow/types';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { getContentColor } from '@/lib/darkColors';

const modeConfig: Record<TransportMode, { label: string; color: string }> = {
  velo: { label: 'Vélo', color: '#16A34A' },
  bus: { label: 'Bus', color: '#1D4ED8' },
  trottinette: { label: 'Trottinette', color: '#0891B2' },
  marche: { label: 'Marche', color: '#7C3AED' },
  metro: { label: 'Métro', color: '#4F46E5' },
  tram: { label: 'Tram', color: '#B45309' },
  covoiturage: { label: 'Covoiturage', color: '#B85C00' },
};

interface BadgeProps {
  mode: TransportMode;
  selected?: boolean;
  onClick?: () => void;
}

export function Badge({ mode, selected = false, onClick }: BadgeProps) {
  const config = modeConfig[mode];
  const isDark = useIsDarkMode();
  const color = getContentColor(config.color, isDark);

  // Alpha du fond translucide réduit en sombre (0x20→0x15) : composité sur
  // --color-surface (plus clair que le fond de page), un fond à 12.5% s'avère
  // trop clair et fait tomber certaines couleurs sous 4.5:1 (ex. metro
  // 4.41:1) — vérifié par calcul de contraste (Phase 4, régression Lighthouse
  // sur /profil). 0x15 (~8.2%) donne 4.73:1 dans le pire cas.
  const alphaHex = isDark ? '15' : '20';

  const style = selected
    ? { backgroundColor: `${color}${alphaHex}`, borderColor: color, color }
    : {
        backgroundColor: 'rgb(var(--color-bg))',
        borderColor: 'rgb(var(--color-divider))',
        color: 'rgb(var(--color-muted))',
      };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={config.label}
      className="inline-flex items-center gap-1.5 rounded-[999px] border px-3 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={style}
    >
      {selected ? <span aria-hidden="true">✓</span> : null}
      {config.label}
    </button>
  );
}
