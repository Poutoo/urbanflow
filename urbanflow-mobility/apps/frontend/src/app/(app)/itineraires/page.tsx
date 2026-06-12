'use client'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { RouteResultsPanel, type SearchResult } from '@/components/routes/RouteResultsPanel'
import type { RouteResult } from '@/components/routes/RouteCard'

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-200" />,
})

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'
const PARIS = { lat: 48.8566, lng: 2.3522 }

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=fr`
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const first = data[0]
    if (!first) return null
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) }
  } catch {
    return null
  }
}

function ItinerairesContent() {
  const params = useSearchParams()
  const { data: session } = useSession()

  const toAddress = params.get('toAddress') ?? ''
  const fromLat = parseFloat(params.get('fromLat') ?? String(PARIS.lat))
  const fromLng = parseFloat(params.get('fromLng') ?? String(PARIS.lng))

  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteResult | null>(null)

  useEffect(() => {
    if (!toAddress) return

    let cancelled = false

    async function search() {
      setLoading(true)
      setError(null)
      setResults(null)
      setSelectedRoute(null)

      const dest = await geocodeAddress(toAddress)
      if (cancelled) return
      if (!dest) {
        setError('Adresse introuvable. Essayez une adresse plus précise.')
        setLoading(false)
        return
      }

      try {
        const token = (session as { accessToken?: string } | null)?.accessToken
        const res = await fetch(`${API_URL}/routes/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fromLat, fromLng, toLat: dest.lat, toLng: dest.lng }),
        })

        if (cancelled) return

        if (!res.ok) {
          setError(
            res.status === 401
              ? 'Connexion requise pour rechercher un itinéraire.'
              : `Erreur serveur (${res.status}). Réessayez.`,
          )
          setLoading(false)
          return
        }

        const data = (await res.json()) as SearchResult
        if (cancelled) return
        setResults(data)
        setSelectedRoute(data.ecological ?? data.fast ?? data.economic)
      } catch {
        if (!cancelled) setError('Impossible de joindre le serveur. Vérifiez votre connexion.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void search()
    return () => {
      cancelled = true
    }
  }, [toAddress, fromLat, fromLng, session])

  const mapSections = selectedRoute?.sections ?? []
  const mapStations = results?.nearbyBikeStations ?? []

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-3">
        <a
          href="/carte"
          className="shrink-0 rounded-full p-1 text-[#6B7280] transition hover:bg-gray-100"
          aria-label="Retour à la carte"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0F1B2D]">
            {toAddress || 'Itinéraire'}
          </p>
          <p className="text-xs text-[#6B7280]">Depuis votre position</p>
        </div>
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A5F7A] border-t-transparent" />
        )}
      </div>

      {/* Map — 40% */}
      <div className="h-[40%] shrink-0">
        <MapView
          userLat={fromLat}
          userLng={fromLng}
          sections={mapSections}
          stations={mapStations}
        />
      </div>

      {/* Results panel — 60% */}
      <div className="h-[60%] overflow-hidden bg-[#F7F9FC]">
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A5F7A] border-t-transparent" />
            <p className="text-sm text-[#6B7280]">Calcul des itinéraires en cours...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-4xl" aria-hidden="true">
              🗺️
            </span>
            <p className="text-sm font-medium text-[#0F1B2D]">{error}</p>
            <a
              href="/carte"
              className="rounded-full bg-[#1A5F7A] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Nouvelle recherche
            </a>
          </div>
        )}

        {!loading && !error && !toAddress && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-4xl" aria-hidden="true">
              🔍
            </span>
            <p className="text-sm text-[#6B7280]">
              Entrez une destination depuis la carte pour lancer la recherche.
            </p>
            <a
              href="/carte"
              className="rounded-full bg-[#1A5F7A] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Aller à la carte
            </a>
          </div>
        )}

        {!loading && !error && results && (
          <RouteResultsPanel
            results={results}
            selectedId={selectedRoute?.id ?? null}
            onSelect={setSelectedRoute}
          />
        )}
      </div>
    </div>
  )
}

export default function ItinerairesPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-64px)] animate-pulse bg-gray-100" />}>
      <ItinerairesContent />
    </Suspense>
  )
}
