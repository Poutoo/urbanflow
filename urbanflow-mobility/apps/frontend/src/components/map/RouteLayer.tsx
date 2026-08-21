'use client'
import { Tooltip } from 'react-leaflet'
import { AnimatedPolyline } from './AnimatedPolyline'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { getContentColor } from '@/lib/darkColors'

// Normalise les noms de modes Navitia (français, majuscules, accents) vers des clés internes
const FRENCH_MODE_MAP: Record<string, string> = {
  métro: 'metro',
  metro: 'metro',
  bus: 'bus',
  autobus: 'bus',
  tramway: 'tram',
  tram: 'tram',
  rer: 'rapidtransit',
  transilien: 'rapidtransit',
  'rer/transilien': 'rapidtransit',
  rapidtransit: 'rapidtransit',
  vélo: 'bicycle',
  velo: 'bicycle',
  bss_rent: 'bicycle',
  marche: 'walking',
  walking: 'walking',
  street_network: 'walking',
  streetnetwork: 'walking',
  transfer: 'walking',
}

const MODE_COLORS: Record<string, string> = {
  walking: '#7C3AED',
  bicycle: '#16A34A',
  bus: '#1D4ED8',
  tram: '#B45309',
  metro: '#4F46E5',
  rapidtransit: '#E11D48',
  default: '#6B7280',
}

function getModeColor(type: string, mode: string): string {
  const raw = type === 'public_transport' ? mode : type
  const key = FRENCH_MODE_MAP[raw.toLowerCase().replace(/[\s/]+/g, '')] ?? raw.toLowerCase()
  return MODE_COLORS[key] ?? MODE_COLORS['default']!
}

interface Section {
  type: string
  mode: string
  line?: string
  duration: number
  coordinates: number[][]
  estimated?: boolean
}

interface Props {
  sections: Section[]
}

export function RouteLayer({ sections }: Props) {
  const isDark = useIsDarkMode()
  return (
    <>
      {sections
        .filter((s) => s.coordinates.length >= 2)
        .map((section, i) => {
          const color = getContentColor(getModeColor(section.type, section.mode), isDark)
          const positions = section.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
          return (
            <AnimatedPolyline
              key={i}
              positions={positions}
              color={color}
              weight={section.estimated ? 3 : 5}
              opacity={section.estimated ? 0.55 : 0.9}
              dashArray={section.estimated ? '10 8' : undefined}
              order={i}
            >
              <Tooltip sticky>
                {section.mode}
                {section.line ? ` · ${section.line}` : ''} — {Math.round(section.duration / 60)} min
                {section.estimated ? ' (ligne directe estimée)' : ''}
              </Tooltip>
            </AnimatedPolyline>
          )
        })}
    </>
  )
}
