'use client'
import { useState } from 'react'
import { RouteCard, type RouteResult, type Strategy } from './RouteCard'

interface GbfsStation {
  id: string
  name: string
  lat: number
  lng: number
  bikesAvailable: number
  docksAvailable: number
}

export interface SearchResult {
  fast: RouteResult | null
  ecological: RouteResult | null
  economic: RouteResult | null
  nearbyBikeStations: GbfsStation[]
}

interface Props {
  results: SearchResult
  selectedId: string | null
  onSelect: (route: RouteResult) => void
}

const ORDER: Strategy[] = ['ecological', 'fast', 'economic']

export function RouteResultsPanel({ results, selectedId, onSelect }: Props) {
  const [pmrOnly, setPmrOnly] = useState(false)

  const strategies = ORDER.map((key) => ({ key, route: results[key] })).filter(
    ({ route }) => route !== null && (!pmrOnly || route!.isPmrAccessible),
  )

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold text-[#0F1B2D]">Itinéraires disponibles</h2>
        <button
          onClick={() => setPmrOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            pmrOnly ? 'bg-blue-600 text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
          }`}
          aria-pressed={pmrOnly}
        >
          ♿ Accessible PMR
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {strategies.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl" aria-hidden="true">
              ♿
            </span>
            <p className="text-sm text-[#6B7280]">Aucun itinéraire accessible PMR disponible.</p>
            <button
              onClick={() => setPmrOnly(false)}
              className="mt-1 text-xs font-semibold text-[#1A5F7A] underline"
            >
              Voir tous les itinéraires
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {strategies.map(({ key, route }) =>
              route ? (
                <RouteCard
                  key={key}
                  strategy={key}
                  route={route}
                  isSelected={selectedId === route.id}
                  onSelect={() => onSelect(route)}
                />
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  )
}
