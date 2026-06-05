import type { TransportMode } from '@urbanflow/types';

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

  const style = selected
    ? { backgroundColor: `${config.color}20`, borderColor: config.color, color: config.color }
    : { backgroundColor: '#F7F9FC', borderColor: '#E5E7EB', color: '#6B7280' };

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
