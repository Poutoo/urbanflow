'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { Polyline } from 'react-leaflet'
import type { Polyline as LeafletPolyline } from 'leaflet'

interface Props {
  positions: [number, number][]
  color: string
  weight: number
  opacity: number
  dashArray?: string
  /** Ordre du segment : décale le départ de l'animation pour un effet en cascade */
  order?: number
  children?: ReactNode
}

const DRAW_MS = 550
const STAGGER_MS = 150

/**
 * Polyline Leaflet qui s'anime à l'apparition plutôt que de surgir brutalement :
 * - segments pleins : effet de tracé progressif (stroke-dashoffset)
 * - segments pointillés (estimés) : fondu en opacité
 * Respecte prefers-reduced-motion (accessibilité).
 */
export function AnimatedPolyline({
  positions,
  color,
  weight,
  opacity,
  dashArray,
  order = 0,
  children,
}: Props) {
  const ref = useRef<LeafletPolyline | null>(null)

  // Signature stable du tracé : évite de rejouer l'animation lors d'un re-render
  // non lié (ex. rafraîchissement des stations Vélib' toutes les 30 s).
  const first = positions[0]?.join(',') ?? ''
  const last = positions[positions.length - 1]?.join(',') ?? ''
  const signature = `${positions.length}:${first}:${last}`

  useEffect(() => {
    const layer = ref.current
    const path = (layer as unknown as { _path?: SVGPathElement } | null)?._path
    if (!path || typeof path.getTotalLength !== 'function') return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const delay = order * STAGGER_MS

    if (dashArray) {
      // Longueur exacte non pertinente pour un pointillé → simple fondu
      path.style.transition = 'none'
      path.style.opacity = '0'
      requestAnimationFrame(() => {
        path.style.transition = `opacity ${DRAW_MS}ms ease ${delay}ms`
        path.style.opacity = String(opacity)
      })
      return
    }

    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    void path.getBoundingClientRect() // force le reflow avant la transition
    requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset ${DRAW_MS}ms ease-in-out ${delay}ms`
      path.style.strokeDashoffset = '0'
    })
    // Rejoué uniquement quand le tracé change réellement (via `signature`) —
    // color/weight/opacity/order sont stables pour un tracé donné.
  }, [signature])

  return (
    <Polyline ref={ref} positions={positions} pathOptions={{ color, weight, opacity, dashArray }}>
      {children}
    </Polyline>
  )
}
