'use client'
import { useState, useEffect } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

/**
 * Suit la position GPS en temps réel via watchPosition (contrairement à
 * useGeolocation qui fait un getCurrentPosition ponctuel). Adapté au suivi
 * d'un trajet en cours. Le watcher est nettoyé au démontage.
 */
export function useWatchPosition(enabled: boolean): GeoState {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    error: null,
    loading: enabled,
  })

  useEffect(() => {
    if (!enabled) return

    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Géolocalisation non supportée', loading: false }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        }),
      (err) => setState((s) => ({ ...s, error: err.message, loading: false })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled])

  return state
}
