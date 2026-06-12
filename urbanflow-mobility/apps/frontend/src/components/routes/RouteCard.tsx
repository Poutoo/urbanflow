'use client'
import { SectionPill } from './SectionPill'

export interface RouteSection {
  type: string
  mode: string
  line?: string
  duration: number
  coordinates: number[][]
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
  fast: { label: 'Rapide', color: '#B85C00', bg: '#FFF7ED', border: '#FED7AA', icon: '⚡' },
  ecological: {
    label: 'Écologique',
    color: '#2D7D46',
    bg: '#F0FDF4',
    border: '#86EFAC',
    icon: '🌿',
    recommended: true,
  },
  economic: { label: 'Économique', color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', icon: '💶' },
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
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
      className="rounded-2xl border-2 p-4 transition-shadow"
      style={{
        borderColor: isSelected ? style.color : style.border,
        backgroundColor: isSelected ? style.bg : '#FFFFFF',
        boxShadow: isSelected ? `0 4px 12px ${style.color}33` : undefined,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {style.icon}
          </span>
          <span className="text-sm font-bold" style={{ color: style.color }}>
            {style.label}
          </span>
          {style.recommended && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: style.color }}
            >
              LE PLUS VERT
            </span>
          )}
          {route.isPmrAccessible && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              ♿ PMR
            </span>
          )}
        </div>
        <span className="shrink-0 text-base font-bold text-[#0F1B2D]">{formatDuration(route.duration)}</span>
      </div>

      {/* Section pills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {visibleSections.map((s, i) => (
          <SectionPill key={i} type={s.type} mode={s.mode} line={s.line} duration={s.duration} />
        ))}
      </div>

      {/* CO2 */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
        <span>🌍 {(route.co2Kg * 1000).toFixed(0)} g CO₂</span>
        {route.co2SavedKg > 0 && (
          <span className="font-semibold" style={{ color: '#2D7D46' }}>
            -{(route.co2SavedKg * 1000).toFixed(0)} g vs voiture
          </span>
        )}
      </div>

      {strategy === 'ecological' && (
        <p className="mb-3 text-[10px] text-[#9CA3AF]">
          Émissions estimées sur la base des facteurs ADEME Base Carbone
        </p>
      )}

      <button
        onClick={onSelect}
        className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
        style={{ backgroundColor: style.color }}
      >
        {isSelected ? '✓ Itinéraire sélectionné' : 'Choisir cet itinéraire'}
      </button>
    </div>
  )
}
