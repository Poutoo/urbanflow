'use client'
import type { GbfsStation } from '@urbanflow/types'
import { useApiSwr } from './useApiSwr'

/**
 * Stations Vélib' à proximité, rafraîchies automatiquement toutes les 30s
 * (Sprint 3 — disponibilités temps réel GBFS).
 */
export function useNearbyStations(lat: number | null, lng: number | null) {
  const key =
    lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `/gbfs/nearby?lat=${lat}&lng=${lng}`
      : null

  const { data } = useApiSwr<GbfsStation[]>(key, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  return data ?? []
}
