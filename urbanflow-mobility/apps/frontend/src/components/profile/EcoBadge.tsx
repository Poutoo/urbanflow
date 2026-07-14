import { ProgressBar } from '@/components/ui/ProgressBar';
import { ECO_BADGE_LEVELS } from './ecoBadgeLevels';

interface EcoBadgeProps {
  badgeLevel: number;
  totalCo2SavedKg: number;
}

export function EcoBadge({ badgeLevel, totalCo2SavedKg }: EcoBadgeProps) {
  const current = ECO_BADGE_LEVELS.find((l) => l.level === badgeLevel);
  const next = ECO_BADGE_LEVELS.find((l) => l.level === badgeLevel + 1);

  return (
    <div className="space-y-2 px-4 pb-3">
      {current ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-[999px] px-3 py-1 text-sm font-semibold"
          style={{ backgroundColor: `${current.color}1A`, color: current.color }}
        >
          <span aria-hidden="true">{current.emoji}</span>
          {current.name}
        </span>
      ) : (
        <p className="text-xs text-[#6B7280]">Pas encore de badge éco-mobile</p>
      )}

      {next ? (
        <>
          <ProgressBar
            percent={(totalCo2SavedKg / next.thresholdKg) * 100}
            color={next.color}
            ariaLabel={`Progression vers le badge ${next.name}`}
          />
          <p className="text-xs text-[#6B7280]">
            {totalCo2SavedKg.toFixed(1)} / {next.thresholdKg} kg pour {next.emoji} {next.name}
          </p>
        </>
      ) : (
        <>
          <ProgressBar
            percent={100}
            color={current!.color}
            ariaLabel="Progression du badge éco-mobile : niveau maximum atteint"
          />
          <p className="text-xs font-semibold" style={{ color: current!.color }}>
            Niveau maximum atteint 🎉
          </p>
        </>
      )}
    </div>
  );
}
