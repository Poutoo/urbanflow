interface ProgressBarProps {
  percent: number;
  color: string;
  ariaLabel: string;
}

/** Barre de progression générique (piste grise + remplissage coloré animé). */
export function ProgressBar({ percent, color, ariaLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-gray-100"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
