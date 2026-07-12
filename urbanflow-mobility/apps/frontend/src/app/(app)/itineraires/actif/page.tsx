'use client'
import dynamic from 'next/dynamic'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAnimatedLatLng } from '@/hooks/useAnimatedLatLng'
import type { RouteResult, RouteSection, Strategy } from '@/components/routes/RouteCard'

const MapView = dynamic(() => import('@/components/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-200" />,
})

const STRATEGY_LABEL: Record<Strategy, string> = {
  fast: 'Rapide',
  ecological: 'Écologique',
  economic: 'Économique',
}

interface ModeMeta {
  icon: string
  label: string
  color: string
}

// Métadonnées d'affichage par mode, alignées sur SectionPill / la carte
const MODE_META: Record<string, ModeMeta> = {
  walking: { icon: 'ph:person-simple-walk', label: 'Marche', color: '#7C3AED' },
  bicycle: { icon: 'ph:bicycle', label: 'Vélo', color: '#16A34A' },
  bus: { icon: 'ph:bus', label: 'Bus', color: '#1D4ED8' },
  tram: { icon: 'ph:train-simple', label: 'Tram', color: '#B45309' },
  metro: { icon: 'ph:train-simple', label: 'Métro', color: '#4F46E5' },
  rapidtransit: { icon: 'ph:train', label: 'RER / Train', color: '#E11D48' },
  default: { icon: 'ph:map-pin', label: 'Trajet', color: '#6B7280' },
}

function modeKey(section: RouteSection): string {
  if (section.type === 'bss_rent' || section.mode === 'bicycle') return 'bicycle'
  if (['walking', 'street_network', 'transfer'].includes(section.type)) return 'walking'
  const m = section.mode.toLowerCase()
  if (m.includes('métro') || m.includes('metro')) return 'metro'
  if (m.includes('tram')) return 'tram'
  if (m.includes('bus')) return 'bus'
  if (m.includes('rer') || m.includes('transilien') || m.includes('train')) return 'rapidtransit'
  return 'default'
}

function sectionInstruction(section: RouteSection, meta: ModeMeta): string {
  const key = modeKey(section)
  if (key === 'walking') {
    return section.to ? `Marchez jusqu'à ${section.to}` : 'Continuez à pied'
  }
  if (key === 'bicycle') {
    return section.to ? `Roulez jusqu'à ${section.to}` : 'Enfourchez un Vélib’ et roulez'
  }
  // Transport en commun
  const line = section.line ? ` ${section.line}` : ''
  const dest = section.to ? ` → ${section.to}` : ''
  return `${meta.label}${line}${dest}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}min` : `${m} min`
}

const PARIS = { lat: 48.8566, lng: 2.3522 }

function ActiveJourneyContent() {
  const params = useSearchParams()
  const router = useRouter()
  const strategy = (params.get('strategy') as Strategy | null) ?? 'ecological'

  const [route, setRoute] = useState<RouteResult | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('activeJourney')
      if (raw) {
        const data = JSON.parse(raw) as { strategy?: Strategy; route?: RouteResult }
        if (data.route) setRoute(data.route)
      }
    } catch {
      // payload corrompu → on affichera l'écran "aucun trajet"
    } finally {
      setHydrated(true)
    }
  }, [])

  // Sections visibles (on masque les attentes et les dépôts de vélo)
  const sections = useMemo(
    () => (route?.sections ?? []).filter((s) => s.type !== 'waiting' && s.type !== 'bss_put'),
    [route],
  )

  // Point de départ du tracé : position initiale du marqueur simulé (étape 0)
  const routeStart = useMemo(() => {
    const first = sections.find((s) => s.coordinates.length > 0)?.coordinates[0]
    return first ? { lat: first[1]!, lng: first[0]! } : PARIS
  }, [sections])

  // Simulation de la progression : quand l'utilisateur avance d'étape, le point
  // glisse jusqu'au début de la nouvelle étape (= fin de la précédente, sections
  // recollées). Utile pour tester/démontrer le suivi sans se déplacer réellement.
  const stepStart = useMemo(() => {
    const coord = sections[activeStep]?.coordinates[0]
    return coord ? ([coord[1]!, coord[0]!] as [number, number]) : ([routeStart.lat, routeStart.lng] as [number, number])
  }, [sections, activeStep, routeStart])
  const simulatedPosition = useAnimatedLatLng(stepStart)

  if (hydrated && !route) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          🧭
        </span>
        <p className="text-sm font-medium text-[#0F1B2D]">
          Aucun trajet en cours. Lancez un itinéraire depuis la carte.
        </p>
        <a
          href="/carte"
          className="rounded-full bg-[#1A5F7A] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Aller à la carte
        </a>
      </div>
    )
  }

  if (!route) {
    return <div className="h-[calc(100vh-64px)] animate-pulse bg-gray-100" />
  }

  // La position affichée suit la progression simulée par étape plutôt que le
  // GPS réel : la progression n'est pas détectée automatiquement (l'utilisateur
  // avance manuellement), donc le point doit refléter l'étape sélectionnée.
  const [userLat, userLng] = simulatedPosition

  const remainingSec = sections.slice(activeStep).reduce((sum, s) => sum + s.duration, 0)
  const isLastStep = activeStep >= sections.length - 1

  function finishJourney() {
    try {
      localStorage.removeItem('activeJourney')
    } catch {
      // sans importance
    }
    router.push('/carte')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Carte — 55 % */}
      <div className="h-[55%] shrink-0">
        <MapView userLat={userLat} userLng={userLng} sections={route.sections} />
      </div>

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2D7D46] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2D7D46]" />
            </span>
            <p className="text-sm font-bold text-[#0F1B2D]">
              En route · {STRATEGY_LABEL[strategy]}
            </p>
          </div>
          <p className="text-xs text-[#6B7280]">
            Simulation du trajet · étape {activeStep + 1}/{sections.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#1A5F7A]">{formatDuration(remainingSec)}</p>
          <p className="text-xs text-[#6B7280]">restant</p>
        </div>
      </div>

      {/* Liste des sections */}
      <div className="flex-1 overflow-y-auto bg-[#F7F9FC] px-4 py-3">
        <ol className="flex flex-col gap-2">
          {sections.map((section, i) => {
            const meta = MODE_META[modeKey(section)]!
            const isActive = i === activeStep
            const isDone = i < activeStep
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition',
                    isActive
                      ? 'bg-[#1A5F7A] text-white shadow-sm'
                      : isDone
                        ? 'bg-white text-[#9CA3AF]'
                        : 'bg-white text-[#0F1B2D]',
                  ].join(' ')}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${meta.color}1A`,
                      color: isActive ? '#FFFFFF' : meta.color,
                    }}
                    aria-hidden="true"
                  >
                    <Icon icon={isDone ? 'ph:check' : meta.icon} width={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {meta.label}
                      {section.line ? ` · ${section.line}` : ''}
                    </p>
                    <p
                      className={[
                        'truncate text-sm',
                        isActive ? 'text-white/85' : 'text-[#6B7280]',
                      ].join(' ')}
                    >
                      {sectionInstruction(section, meta)}
                    </p>
                  </div>
                  <span
                    className={[
                      'shrink-0 text-sm font-medium',
                      isActive ? 'text-white' : 'text-[#6B7280]',
                    ].join(' ')}
                  >
                    {Math.max(1, Math.round(section.duration / 60))} min
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2 border-t border-[#E5E7EB] bg-white px-4 py-3">
        {!isLastStep && (
          <button
            type="button"
            onClick={() => setActiveStep((s) => Math.min(s + 1, sections.length - 1))}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1A5F7A] py-3.5 text-sm font-bold text-white"
          >
            <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
            Étape suivante
          </button>
        )}
        <button
          type="button"
          onClick={finishJourney}
          className={[
            'flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition',
            isLastStep
              ? 'flex-1 bg-[#2D7D46] text-white'
              : 'flex-1 border border-[#D1D5DB] bg-white text-[#6B7280]',
          ].join(' ')}
        >
          <Icon icon="ph:flag-checkered" width={16} aria-hidden="true" />
          Terminer le trajet
        </button>
      </div>
    </div>
  )
}

export default function ActiveJourneyPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-64px)] animate-pulse bg-gray-100" />}>
      <ActiveJourneyContent />
    </Suspense>
  )
}
