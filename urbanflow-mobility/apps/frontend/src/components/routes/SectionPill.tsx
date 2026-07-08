'use client'
import { Icon } from '@iconify/react'

interface ModeConfig {
  icon: string
  bg: string   // rgba semi-transparent
  text: string // couleur pleine pour le texte et l'icône
}

const MODE_CONFIG: Record<string, ModeConfig> = {
  walking:        { icon: 'ph:person-simple-walk', bg: 'rgba(124, 58, 237, 0.12)', text: '#6D28D9' },
  street_network: { icon: 'ph:person-simple-walk', bg: 'rgba(124, 58, 237, 0.12)', text: '#6D28D9' },
  transfer:       { icon: 'ph:person-simple-walk', bg: 'rgba(107, 114, 128, 0.12)', text: '#6B7280' },
  bicycle:        { icon: 'ph:bicycle',            bg: 'rgba(22, 163, 74, 0.12)',   text: '#15803D' },
  bss_rent:       { icon: 'ph:bicycle',            bg: 'rgba(22, 163, 74, 0.12)',   text: '#15803D' },
  bus:            { icon: 'ph:bus',                bg: 'rgba(37, 99, 235, 0.12)',   text: '#1D4ED8' },
  tram:           { icon: 'ph:train-simple',       bg: 'rgba(217, 119, 6, 0.12)',   text: '#B45309' },
  metro:          { icon: 'ph:train-simple',       bg: 'rgba(79, 70, 229, 0.13)',   text: '#4338CA' },
  rapidtransit:   { icon: 'ph:train',              bg: 'rgba(220, 38, 38, 0.11)',   text: '#B91C1C' },
  default:        { icon: 'ph:bus',                bg: 'rgba(107, 114, 128, 0.12)', text: '#6B7280' },
}

interface Props {
  type: string
  mode: string
  line?: string
  duration: number
}

export function SectionPill({ type, mode, line, duration }: Props) {
  const key = type === 'public_transport' ? mode.toLowerCase() : type
  const config = MODE_CONFIG[key] ?? MODE_CONFIG[mode.toLowerCase()] ?? MODE_CONFIG.default!
  const mins = Math.round(duration / 60)

  if (mins === 0) return null

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <Icon icon={config.icon} width={13} aria-hidden="true" />
      {line && <span className="font-bold">{line}</span>}
      <span>{mins}&apos;</span>
    </span>
  )
}
