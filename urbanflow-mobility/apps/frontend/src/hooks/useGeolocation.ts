'use client'
import { useState, useEffect } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(enabled: boolean) {
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

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        }),
      (err) => setState((s) => ({ ...s, error: err.message, loading: false })),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [enabled])

  return state
}
