'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePlaceSuggestions, type PlaceSuggestion } from '@/hooks/usePlaceSuggestions'
import { useNearbyStations } from '@/hooks/useNearbyStations'

const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-200" /> },
)

const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 }
const CONSENT_KEY = 'geo_consent'

const TYPE_ICON: Record<string, string> = {
  stop_area: '🚉',
  address: '📍',
  poi: '📌',
}

export default function CartePage() {
  const router = useRouter()
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const geo = useGeolocation(consentGiven === true)
  const { suggestions, loading, clear } = usePlaceSuggestions(
    selectedPlace ? '' : query, // stoppe les requêtes une fois un lieu sélectionné
  )

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'true') {
      setConsentGiven(true)
    } else {
      setShowModal(true)
    }
  }, [])

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setShowDropdown(suggestions.length > 0)
  }, [suggestions])

  function handleAllow() {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsentGiven(true)
    setShowModal(false)
  }

  function handleDeny() {
    setConsentGiven(false)
    setShowModal(false)
  }

  function handleInputChange(value: string) {
    setQuery(value)
    setSelectedPlace(null) // reset si l'utilisateur retape
  }

  function handleSelect(place: PlaceSuggestion) {
    setQuery(place.name)
    setSelectedPlace(place)
    setShowDropdown(false)
    clear()
    navigate(place)
  }

  function navigate(place: PlaceSuggestion) {
    const fromLat = geo.lat ?? PARIS_CENTER.lat
    const fromLng = geo.lng ?? PARIS_CENTER.lng
    const params = new URLSearchParams({
      toAddress: place.name,
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(place.lat),
      toLng: String(place.lng),
    })
    router.push(`/itineraires?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    // Si un lieu a déjà été sélectionné, naviguer directement
    if (selectedPlace) {
      navigate(selectedPlace)
      return
    }

    // Sinon utiliser la première suggestion disponible
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]!)
      return
    }

    // Fallback : naviguer sans coordonnées (géocodage côté itinéraires)
    const fromLat = geo.lat ?? PARIS_CENTER.lat
    const fromLng = geo.lng ?? PARIS_CENTER.lng
    router.push(
      `/itineraires?${new URLSearchParams({
        toAddress: trimmed,
        fromLat: String(fromLat),
        fromLng: String(fromLng),
      }).toString()}`,
    )
  }

  const mapLat = geo.lat ?? PARIS_CENTER.lat
  const mapLng = geo.lng ?? PARIS_CENTER.lng

  // Stations Vélib' à proximité, rafraîchies toutes les 30s
  const stations = useNearbyStations(consentGiven ? geo.lat : null, consentGiven ? geo.lng : null)

  return (
    <div className="relative h-[calc(100vh-64px)] w-full">
      {/* Carte full-screen */}
      <MapView userLat={mapLat} userLng={mapLng} stations={stations} />

      {/* Barre de recherche + dropdown */}
      <div className="absolute left-1/2 top-4 z-[1000] w-[90%] max-w-md -translate-x-1/2">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg">
            {loading ? (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1A5F7A] border-t-transparent" />
            ) : (
              <svg className="h-5 w-5 shrink-0 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Où voulez-vous aller ?"
              className="w-full bg-transparent text-sm text-[#0F1B2D] placeholder-[#6B7280] outline-none"
              aria-label="Destination"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setSelectedPlace(null); clear(); setShowDropdown(false) }}
                className="shrink-0 text-[#6B7280] hover:text-[#0F1B2D]"
                aria-label="Effacer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {query && (
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#1A5F7A] px-3 py-1 text-xs font-semibold text-white"
                aria-label="Rechercher"
              >
                Go
              </button>
            )}
          </div>
        </form>

        {/* Dropdown suggestions */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            role="listbox"
            className="mt-1.5 overflow-hidden rounded-2xl bg-white shadow-lg"
          >
            {suggestions.map((place, i) => (
              <button
                key={i}
                role="option"
                type="button"
                onClick={() => handleSelect(place)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F7F9FC] focus:bg-[#F7F9FC] focus:outline-none"
              >
                <span className="text-base" aria-hidden="true">
                  {TYPE_ICON[place.type] ?? '📍'}
                </span>
                <span className="text-sm text-[#0F1B2D]">{place.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indicateur d'erreur géolocalisation */}
      {geo.error && consentGiven && (
        <div className="absolute bottom-24 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-800 shadow">
          Position approximative — {geo.error}
        </div>
      )}

      {/* Modale RGPD géolocalisation */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="geo-modal-title"
          className="absolute inset-0 z-[2000] flex items-end justify-center bg-black/40 pb-8"
        >
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📍</span>
              <h2 id="geo-modal-title" className="text-base font-bold text-[#0F1B2D]">
                Autoriser la géolocalisation
              </h2>
            </div>
            <p className="mb-5 text-sm text-[#6B7280]">
              UrbanFlow utilise votre position GPS pour afficher les itinéraires depuis votre position actuelle.
              Vos données de localisation ne sont pas enregistrées ni partagées.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAllow}
                className="w-full rounded-full bg-[#1A5F7A] py-3 text-sm font-semibold text-white transition hover:bg-[#155270]"
              >
                Autoriser
              </button>
              <button
                onClick={handleDeny}
                className="w-full rounded-full border border-[#6B7280] py-3 text-sm font-semibold text-[#6B7280] transition hover:bg-gray-50"
              >
                Refuser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
