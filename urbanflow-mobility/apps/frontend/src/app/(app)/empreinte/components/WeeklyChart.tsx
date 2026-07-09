'use client'
import type { WeeklyDay } from '@urbanflow/types'

interface Props {
  days: WeeklyDay[]
}

/**
 * Graphique barres des 7 derniers jours — HTML/CSS pur, sans lib externe
 * (éco-conception C5 : pas de bundle supplémentaire).
 * Le jour avec la plus grande valeur est mis en avant en vert foncé.
 */
export function WeeklyChart({ days }: Props) {
  const max = Math.max(...days.map((d) => d.co2SavedKg), 1)
  const bestValue = Math.max(...days.map((d) => d.co2SavedKg))

  return (
    <div
      className="flex items-end justify-between gap-2 px-2"
      role="img"
      aria-label={`CO₂ évité par jour sur les 7 derniers jours, maximum ${bestValue.toFixed(1)} kg`}
    >
      {days.map((day, i) => {
        const heightPct = (day.co2SavedKg / max) * 100
        const isHighlight = day.co2SavedKg > 0 && day.co2SavedKg === bestValue

        return (
          <div key={`${day.date}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <span className="h-4 text-xs text-[#6B7280]">
              {day.co2SavedKg > 0 ? day.co2SavedKg.toFixed(1) : ''}
            </span>
            <div className="flex w-full items-end" style={{ height: '80px' }}>
              <div
                className={`w-full rounded-t-lg transition-all ${isHighlight ? 'bg-[#2D7D46]' : 'bg-[#D4EFE1]'}`}
                style={{ height: `${Math.max(heightPct, 4)}%` }}
              />
            </div>
            <span className="text-xs text-[#6B7280]">{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}
