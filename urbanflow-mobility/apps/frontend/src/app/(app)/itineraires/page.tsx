'use client'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { RouteResultsPanel, type SearchResult } from '@/components/routes/RouteResultsPanel'
import type { RouteResult, RouteSection, Strategy } from '@/components/routes/RouteCard'

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

// Normalise une section vers une clé de mode pour le dashboard CO₂
function sectionModeKey(section: RouteSection): string {
  if (section.type === 'public_transport') {
    const mode = section.mode.toLowerCase()
    if (mode.includes('métro') || mode.includes('metro')) return 'metro'
    if (mode.includes('tram')) return 'tram'
    if (mode.includes('bus')) return 'bus'
    if (mode.includes('rer') || mode.includes('train')) return 'rapidtransit'
    return 'bus'
  }
  if (section.type === 'bss_rent' || section.mode === 'bike') return 'velo'
  return 'walking'
}

// Mode dominant du trajet = mode de la section la plus longue en durée
function getPrimaryMode(sections: RouteSection[]): string {
  const longest = [...sections]
    .filter((s) => s.type !== 'waiting')
    .sort((a, b) => b.duration - a.duration)[0]
  return longest ? sectionModeKey(longest) : 'walking'
}

function ItinerairesContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  const toAddress = params.get('toAddress') ?? ''
  const fromLat = parseFloat(params.get('fromLat') ?? String(PARIS.lat))
  const fromLng = parseFloat(params.get('fromLng') ?? String(PARIS.lng))
  // Coordonnées pré-résolues par l'autocomplétion (évite le géocodage Nominatim)
  const preToLat = parseFloat(params.get('toLat') ?? '')
  const preToLng = parseFloat(params.get('toLng') ?? '')

  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteResult | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [starting, setStarting] = useState(false)

  // Valide l'itinéraire : enregistre le CO₂ économisé puis lance la navigation active
  async function handleStartJourney() {
    if (!selectedRoute || !selectedStrategy) return
    setStarting(true)

    try {
      const token = (session as { accessToken?: string } | null)?.accessToken
      await fetch(`${API_URL}/co2/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          co2SavedKg: selectedRoute.co2SavedKg,
          co2EmittedKg: selectedRoute.co2Kg,
          distanceKm: selectedRoute.distanceKm,
          primaryMode: getPrimaryMode(selectedRoute.sections),
          strategy: selectedStrategy,
          durationMin: Math.round(selectedRoute.duration / 60),
        }),
      })
    } catch (err) {
      // Non bloquant — l'utilisateur continue même si l'enregistrement échoue
      console.warn('CO₂ record failed:', err)
    }

    // Le trajet sélectionné est transmis à la page de navigation active via localStorage
    // (payload trop volumineux pour un query param : géométrie complète du tracé).
    try {
      localStorage.setItem(
        'activeJourney',
        JSON.stringify({ strategy: selectedStrategy, route: selectedRoute }),
      )
    } catch (err) {
      console.warn('Impossible de sauvegarder le trajet actif:', err)
    }

    router.push(`/itineraires/actif?strategy=${selectedStrategy}`)
  }

  useEffect(() => {
    if (!toAddress) return

    let cancelled = false

    async function search() {
      setLoading(true)
      setError(null)
      setResults(null)
      setSelectedRoute(null)
      setSelectedStrategy(null)

      // Si les coordonnées de destination sont déjà dans l'URL (autocomplétion), on les utilise directement
      let dest: { lat: number; lng: number } | null =
        !isNaN(preToLat) && !isNaN(preToLng) ? { lat: preToLat, lng: preToLng } : null

      if (!dest) {
        dest = await geocodeAddress(toAddress)
        if (cancelled) return
        if (!dest) {
          setError(
            `Adresse introuvable. Essayez un format précis, par exemple : "Tour Eiffel, Paris" ou "15 rue de Rivoli, Paris".`,
          )
          setLoading(false)
          return
        }
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
              ? 'Connexion requise. Reconnectez-vous avec email et mot de passe.'
              : res.status === 404
                ? 'Aucun itinéraire trouvé pour ce trajet. Essayez une autre destination.'
                : 'Erreur lors du calcul. Vérifiez que le serveur est démarré.',
          )
          setLoading(false)
          return
        }

        const data = (await res.json()) as SearchResult
        if (cancelled) return
        setResults(data)
        // Sélection par défaut : écologique, puis rapide, puis économique
        const defaultStrategy: Strategy = data.ecological ? 'ecological' : data.fast ? 'fast' : 'economic'
        setSelectedStrategy(defaultStrategy)
        setSelectedRoute(data[defaultStrategy])
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
  }, [toAddress, fromLat, fromLng, preToLat, preToLng, session])

  const mapSections = selectedRoute?.sections ?? []
  const mapStations = results?.nearbyBikeStations ?? []

  const STRATEGY_LABEL: Record<Strategy, string> = {
    fast: 'rapide',
    ecological: 'écologique',
    economic: 'économique',
  }
  const startLabel = selectedStrategy
    ? `Démarrer l'itinéraire ${STRATEGY_LABEL[selectedStrategy]}`
    : 'Sélectionner un itinéraire'

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

      {/* Map — 35% */}
      <div className="h-[35%] shrink-0">
        <MapView
          userLat={fromLat}
          userLng={fromLng}
          sections={mapSections}
          stations={mapStations}
          recommendedStationId={selectedRoute?.recommendedBikeStation?.station.id}
        />
      </div>

      {/* Results panel — flexible */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F7F9FC]">
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A5F7A] border-t-transparent" />
            <p className="text-sm text-[#6B7280]">Calcul des itinéraires en cours...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-4xl" aria-hidden="true">🗺️</span>
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
            <span className="text-4xl" aria-hidden="true">🔍</span>
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
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <RouteResultsPanel
                results={results}
                selectedStrategy={selectedStrategy}
                onSelect={(route, strategy) => {
                  setSelectedRoute(route)
                  setSelectedStrategy(strategy)
                }}
              />
            </div>

            {/* Bouton Démarrer fixé en bas */}
            <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-3">
              <button
                disabled={!selectedRoute || starting}
                className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#1A5F7A' }}
                onClick={() => void handleStartJourney()}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {startLabel}
              </button>
            </div>
          </div>
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
