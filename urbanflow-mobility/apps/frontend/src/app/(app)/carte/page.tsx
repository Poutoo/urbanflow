'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation } from '@/hooks/useGeolocation'

const MapView = dynamic(
  () => import('@/components/map/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-200" /> },
)

const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 }
const CONSENT_KEY = 'geo_consent'

export default function CartePage() {
  const router = useRouter()
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [destination, setDestination] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'true') {
      setConsentGiven(true)
    } else {
      setShowModal(true)
    }
  }, [])

  const geo = useGeolocation(consentGiven === true)

  function handleAllow() {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsentGiven(true)
    setShowModal(false)
  }

  function handleDeny() {
    setConsentGiven(false)
    setShowModal(false)
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = destination.trim()
    if (!trimmed) return
    const fromLat = geo.lat ?? PARIS_CENTER.lat
    const fromLng = geo.lng ?? PARIS_CENTER.lng
    const params = new URLSearchParams({
      toAddress: trimmed,
      fromLat: String(fromLat),
      fromLng: String(fromLng),
    })
    router.push(`/itineraires?${params.toString()}`)
  }

  const mapLat = geo.lat ?? PARIS_CENTER.lat
  const mapLng = geo.lng ?? PARIS_CENTER.lng

  return (
    <div className="relative h-[calc(100vh-64px)] w-full">
      {/* Carte full-screen */}
      <MapView userLat={mapLat} userLng={mapLng} />

      {/* Barre de recherche overlay */}
      <div className="absolute left-1/2 top-4 z-[1000] w-[90%] max-w-md -translate-x-1/2">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg">
            <svg className="h-5 w-5 shrink-0 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Où voulez-vous aller ?"
              className="w-full bg-transparent text-sm text-[#0F1B2D] placeholder-[#6B7280] outline-none"
              aria-label="Destination"
            />
            {destination && (
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
