'use client';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { getContentColor } from '@/lib/darkColors';
import { ECO_BADGE_LEVELS } from './ecoBadgeLevels';

interface EcoBadgeProps {
  badgeLevel: number;
  totalCo2SavedKg: number;
}

export function EcoBadge({ badgeLevel, totalCo2SavedKg }: EcoBadgeProps) {
  const isDark = useIsDarkMode();
  const current = ECO_BADGE_LEVELS.find((l) => l.level === badgeLevel);
  const next = ECO_BADGE_LEVELS.find((l) => l.level === badgeLevel + 1);
  const currentColor = current ? getContentColor(current.color, isDark) : undefined;
  const nextColor = next ? getContentColor(next.color, isDark) : undefined;

  return (
    <div className="space-y-2 px-4 pb-3">
      {current ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-[999px] px-3 py-1 text-sm font-semibold"
          style={{ backgroundColor: `${currentColor}1A`, color: currentColor }}
        >
          <span aria-hidden="true">{current.emoji}</span>
          {current.name}
        </span>
      ) : (
        <p className="text-xs text-[#6B7280] dark:text-muted">Pas encore de badge éco-mobile</p>
      )}

      {next ? (
        <>
          <ProgressBar
            percent={(totalCo2SavedKg / next.thresholdKg) * 100}
            color={nextColor!}
            ariaLabel={`Progression vers le badge ${next.name}`}
          />
          <p className="text-xs text-[#6B7280] dark:text-muted">
            {totalCo2SavedKg.toFixed(1)} / {next.thresholdKg} kg pour {next.emoji} {next.name}
          </p>
        </>
      ) : (
        <>
          <ProgressBar
            percent={100}
            color={currentColor!}
            ariaLabel="Progression du badge éco-mobile : niveau maximum atteint"
          />
          <p className="text-xs font-semibold" style={{ color: currentColor }}>
            Niveau maximum atteint 🎉
          </p>
        </>
      )}
    </div>
  );
}
