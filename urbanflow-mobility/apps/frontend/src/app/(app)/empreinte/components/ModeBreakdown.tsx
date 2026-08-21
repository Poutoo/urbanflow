'use client'
import { Icon } from '@iconify/react'
import type { ModeBreakdownItem } from '@urbanflow/types'

// Couleurs par mode (design system CONTEXT.md)
const MODE_COLORS: Record<string, string> = {
  velo: '#16A34A',
  bicycle: '#16A34A',
  bss_rent: '#16A34A',
  bus: '#1D4ED8',
  tram: '#B45309',
  metro: '#4F46E5',
  rapidtransit: '#4F46E5',
  walking: '#7C3AED',
  default: '#6B7280',
}

const MODE_LABELS: Record<string, string> = {
  velo: 'Vélo',
  bicycle: 'Vélo',
  bss_rent: 'Vélib’',
  bus: 'Bus',
  tram: 'Tram',
  metro: 'Métro',
  rapidtransit: 'RER / Train',
  walking: 'Marche',
}

// Icônes identiques à celles des itinéraires (voir SectionPill)
const MODE_ICONS: Record<string, string> = {
  velo: 'ph:bicycle',
  bicycle: 'ph:bicycle',
  bss_rent: 'ph:bicycle',
  bus: 'ph:bus',
  tram: 'ph:train-simple',
  metro: 'ph:train-simple',
  rapidtransit: 'ph:train',
  walking: 'ph:person-simple-walk',
}

function colorOf(mode: string): string {
  return MODE_COLORS[mode] ?? MODE_COLORS['default']!
}

interface Props {
  breakdown: ModeBreakdownItem[]
}

/** Barre multi-segments + liste distance/pourcentage par mode (maquette écran 4) */
export function ModeBreakdown({ breakdown }: Props) {
  if (breakdown.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[#6B7280] dark:text-muted">
        Aucun trajet enregistré ce mois-ci. Validez un itinéraire pour commencer !
      </p>
    )
  }

  const sorted = [...breakdown].sort((a, b) => b.percentage - a.percentage)

  return (
    <div className="space-y-3">
      {/* Barre colorée multi-segments */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-divider" aria-hidden="true">
        {sorted.map((item) => (
          <div
            key={item.mode}
            style={{ width: `${item.percentage}%`, backgroundColor: colorOf(item.mode) }}
          />
        ))}
      </div>

      {/* Liste par mode */}
      <ul className="divide-y divide-gray-50 dark:divide-divider">
        {sorted.map((item) => (
          <li key={item.mode} className="flex items-center gap-3 py-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: colorOf(item.mode) }}
              aria-hidden="true"
            >
              <Icon icon={MODE_ICONS[item.mode] ?? 'ph:map-pin'} width={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#0F1B2D] dark:text-text-main">
                {MODE_LABELS[item.mode] ?? item.mode}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-muted">
                {item.distanceKm} km · {item.count} trajet{item.count > 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-sm font-bold text-[#0F1B2D] dark:text-text-main">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
