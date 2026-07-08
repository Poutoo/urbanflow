'use client'
import { useState, useEffect } from 'react'

export interface PlaceSuggestion {
  name: string
  lat: number
  lng: number
  type: 'stop_area' | 'address' | 'poi'
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'

export function usePlaceSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/places?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = (await res.json()) as PlaceSuggestion[]
          setSuggestions(data)
        }
      } catch {
        // silently fail — autocomplete is best-effort
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  function clear() {
    setSuggestions([])
  }

  return { suggestions, loading, clear }
}
