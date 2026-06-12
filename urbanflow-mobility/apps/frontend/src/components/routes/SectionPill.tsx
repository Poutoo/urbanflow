'use client'

const MODE_ICONS: Record<string, string> = {
  walking: '🚶',
  street_network: '🚶',
  transfer: '🚶',
  bicycle: '🚲',
  bss_rent: '🚲',
  bss_put: '🚲',
  bus: '🚌',
  tram: '🚃',
  metro: '🚇',
  rapidtransit: '🚊',
  default: '🚌',
}

const MODE_BG: Record<string, string> = {
  walking: '#EDE9FE',
  street_network: '#EDE9FE',
  transfer: '#F3F4F6',
  bicycle: '#DCFCE7',
  bss_rent: '#DCFCE7',
  bus: '#DBEAFE',
  tram: '#FEF3C7',
  metro: '#E0E7FF',
  rapidtransit: '#E0E7FF',
  default: '#F3F4F6',
}

const MODE_TEXT: Record<string, string> = {
  walking: '#7C3AED',
  street_network: '#7C3AED',
  transfer: '#6B7280',
  bicycle: '#16A34A',
  bss_rent: '#16A34A',
  bus: '#1D4ED8',
  tram: '#B45309',
  metro: '#4F46E5',
  rapidtransit: '#4F46E5',
  default: '#6B7280',
}

interface Props {
  type: string
  mode: string
  line?: string
  duration: number
}

export function SectionPill({ type, mode, line, duration }: Props) {
  const key = type === 'public_transport' ? mode.toLowerCase() : type
  const icon = MODE_ICONS[key] ?? MODE_ICONS[mode.toLowerCase()] ?? MODE_ICONS.default
  const bg = MODE_BG[key] ?? MODE_BG.default
  const color = MODE_TEXT[key] ?? MODE_TEXT.default
  const mins = Math.round(duration / 60)

  if (mins === 0) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <span aria-hidden="true">{icon}</span>
      {line && <span>{line}</span>}
      <span>{mins} min</span>
    </span>
  )
}
