'use client'
import { Polyline, Tooltip } from 'react-leaflet'

const MODE_COLORS: Record<string, string> = {
  walking: '#7C3AED',
  bicycle: '#16A34A',
  bss_rent: '#16A34A',
  bus: '#1D4ED8',
  tram: '#B45309',
  metro: '#4F46E5',
  rapidtransit: '#4F46E5',
  default: '#6B7280',
}

interface Section {
  type: string
  mode: string
  line?: string
  duration: number
  coordinates: number[][]
}

interface Props {
  sections: Section[]
}

export function RouteLayer({ sections }: Props) {
  return (
    <>
      {sections
        .filter((s) => s.coordinates.length > 1)
        .map((section, i) => {
          const color = MODE_COLORS[section.type] ?? MODE_COLORS[section.mode] ?? MODE_COLORS['default']
          const positions = section.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
          return (
            <Polyline key={i} positions={positions} pathOptions={{ color, weight: 5, opacity: 0.85 }}>
              <Tooltip sticky>
                {section.mode}
                {section.line ? ` ${section.line}` : ''} — {Math.round(section.duration / 60)} min
              </Tooltip>
            </Polyline>
          )
        })}
    </>
  )
}
