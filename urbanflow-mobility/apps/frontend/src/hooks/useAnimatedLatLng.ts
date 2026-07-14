'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Anime un glissement fluide vers une position [lat, lng] cible, au lieu d'un
 * saut brutal — utilisé pour simuler la progression le long d'un trajet quand
 * l'utilisateur avance manuellement d'étape en étape. Respecte
 * prefers-reduced-motion (saut instantané dans ce cas).
 */
export function useAnimatedLatLng(target: [number, number], durationMs = 900): [number, number] {
  const [pos, setPos] = useState<[number, number]>(target)
  const fromRef = useRef<[number, number]>(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from[0] === target[0] && from[1] === target[1]) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target
      setPos(target)
      return
    }

    const [fromLat, fromLng] = from
    const [toLat, toLng] = target
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setPos([fromLat + (toLat - fromLat) * eased, fromLng + (toLng - fromLng) * eased])
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target[0], target[1], durationMs])

  return pos
}
