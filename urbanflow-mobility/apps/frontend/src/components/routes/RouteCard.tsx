'use client'
import { Icon } from '@iconify/react'
import { SectionPill } from './SectionPill'

export interface RouteSection {
  type: string
  mode: string
  line?: string
  duration: number
  coordinates: number[][]
  estimated?: boolean
}

export interface RouteResult {
  id: string
  duration: number
  departureTime: string
  arrivalTime: string
  co2Kg: number
  co2SavedKg: number
  sections: RouteSection[]
  isPmrAccessible: boolean
}

export type Strategy = 'fast' | 'ecological' | 'economic'

const STRATEGY_STYLE: Record<
  Strategy,
  { label: string; color: string; bg: string; border: string; icon: string; recommended?: boolean }
> = {
  fast: {
    label: 'Rapide',
    color: '#B85C00',
    bg: '#FFF7ED',
    border: '#FED7AA',
    icon: 'ph:lightning',
  },
  ecological: {
    label: 'Écologique',
    color: '#2D7D46',
    bg: '#F0FDF4',
    border: '#86EFAC',
    icon: 'ph:leaf',
    recommended: true,
  },
  economic: {
    label: 'Économique',
    color: '#0e60a3ff',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    icon: 'ph:coins',
  },
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}

function formatTime(navitia: string): string {
  if (!navitia || navitia.length < 13) return ''
  return `${navitia.slice(9, 11)}:${navitia.slice(11, 13)}`
}

interface Props {
  strategy: Strategy
  route: RouteResult
  isSelected: boolean
  onSelect: () => void
}

export function RouteCard({ strategy, route, isSelected, onSelect }: Props) {
  const style = STRATEGY_STYLE[strategy]
  const visibleSections = route.sections.filter((s) => s.type !== 'waiting' && s.type !== 'bss_put')

  return (
    <div
      className="overflow-hidden rounded-2xl border-2 transition-shadow"
      style={{
        borderColor: isSelected ? style.color : style.border,
        backgroundColor: isSelected ? style.bg : '#FFFFFF',
        boxShadow: isSelected ? `0 4px 16px ${style.color}33` : undefined,
      }}
      onClick={onSelect}
    >
      {/* Bandeau recommandé */}
      {style.recommended && (
        <div
          className="flex items-center gap-1.5 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: style.color }}
        >
          <Icon icon="ph:seal-check" width={12} aria-hidden="true" />
          Recommandé · Le plus vert
        </div>
      )}

      <div className="p-4">
        {/* Header : badge + durée + heure d'arrivée */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: style.color }}
            >
              <Icon icon={style.icon} width={14} aria-hidden="true" />
              {style.label}
            </span>
            {route.isPmrAccessible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                <Icon icon="ph:wheelchair" width={11} aria-hidden="true" />
                PMR
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-[#0F1B2D]">{formatDuration(route.duration)}</p>
            {route.arrivalTime && (
              <p className="text-xs text-[#6B7280]">arrivée {formatTime(route.arrivalTime)}</p>
            )}
          </div>
        </div>

        {/* Section pills avec flèches */}
        <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-0.5">
          {visibleSections.map((s, i) => (
            <span key={i} className="inline-flex shrink-0 items-center gap-1">
              {i > 0 && (
                <Icon
                  icon="ph:caret-right"
                  width={12}
                  className="text-[#9CA3AF]"
                  aria-hidden="true"
                />
              )}
              <SectionPill
                type={s.type}
                mode={s.mode}
                line={s.line}
                duration={s.duration}
              />
            </span>
          ))}
        </div>

        {/* CO2 */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
          <span className="inline-flex items-center gap-1">
            <Icon icon="ph:globe-hemisphere-west" width={13} aria-hidden="true" />
            {(route.co2Kg * 1000).toFixed(0)} g CO₂
          </span>
          {route.co2SavedKg > 0 && (
            <span className="font-semibold text-[#2D7D46]">
              −{(route.co2SavedKg * 1000).toFixed(0)} g vs voiture
            </span>
          )}
        </div>

        {strategy === 'ecological' && (
          <p className="mt-1 text-[10px] text-[#9CA3AF]">
            Émissions estimées sur la base des facteurs ADEME Base Carbone
          </p>
        )}
      </div>
    </div>
  )
}
