'use client'
import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { Co2Summary } from '@urbanflow/types'
import { useApiSwr } from '@/hooks/useApiSwr'
import { WeeklyChart } from './components/WeeklyChart'
import { MonthlyGoal } from './components/MonthlyGoal'
import { ModeBreakdown } from './components/ModeBreakdown'

// Libellé de la semaine en cours, du lundi au dimanche (ex : "du 25 au 31 mai")
function getCurrentWeekLabel(): string {
  const now = new Date()
  const day = now.getDay() // 0 = dimanche, 1 = lundi, …
  const monday = new Date(now)
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const dayNum = (d: Date) => d.getDate()
  const monthName = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })

  return monday.getMonth() === sunday.getMonth()
    ? `du ${dayNum(monday)} au ${dayNum(sunday)} ${monthName(sunday)}`
    : `du ${dayNum(monday)} ${monthName(monday)} au ${dayNum(sunday)} ${monthName(sunday)}`
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 pb-24" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
      <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
    </div>
  )
}

export function EmpreinteClient() {
  const { data, isLoading, error, sessionStatus } = useApiSwr<Co2Summary>('/co2/summary')
  const [shareFeedback, setShareFeedback] = useState<'copied' | null>(null)

  // Partage du score via l'API Web Share (mobile), repli sur le presse-papiers
  async function handleShare(totalWeekKg: number) {
    const text = `J'ai évité ${totalWeekKg.toFixed(1)} kg de CO₂ cette semaine avec UrbanFlow 🌿`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Mon empreinte CO₂ — UrbanFlow', text })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setShareFeedback('copied')
        setTimeout(() => setShareFeedback(null), 2000)
      }
    } catch {
      // Annulation utilisateur ou API indisponible — non bloquant
    }
  }

  if (isLoading || sessionStatus === 'loading' || (sessionStatus === 'authenticated' && !data && !error)) {
    return <LoadingSkeleton />
  }

  if (sessionStatus === 'unauthenticated' || error || !data) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl" aria-hidden="true">🌿</span>
        <p className="text-sm font-medium text-[#0F1B2D]">
          {sessionStatus === 'unauthenticated'
            ? 'Connectez-vous pour suivre votre empreinte CO₂.'
            : 'Impossible de charger vos données. Vérifiez que le serveur est démarré.'}
        </p>
        <a
          href={sessionStatus === 'unauthenticated' ? '/login' : '/empreinte'}
          className="rounded-full bg-[#1A5F7A] px-6 py-2.5 text-sm font-semibold text-white"
        >
          {sessionStatus === 'unauthenticated' ? 'Se connecter' : 'Réessayer'}
        </a>
      </div>
    )
  }

  const totalKmDoux = data.breakdown.reduce((sum, m) => sum + m.distanceKm, 0)

  return (
    <div className="flex flex-col gap-4 bg-[#F7F9FC] p-4 pb-24">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F1B2D]">Mon empreinte</h1>
          <p className="text-sm text-[#6B7280]">Semaine {getCurrentWeekLabel()}</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => void handleShare(data.weekly.totalWeekKg)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1A5F7A] shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5F7A]"
            aria-label="Partager mon empreinte CO₂"
          >
            <Icon icon="ph:share-network" width={20} aria-hidden="true" />
          </button>
          {shareFeedback === 'copied' && (
            <span
              role="status"
              className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-lg bg-[#0F1B2D] px-2.5 py-1 text-xs font-medium text-white shadow-lg"
            >
              Copié !
            </span>
          )}
        </div>
      </div>

      {/* Graphique hebdomadaire */}
      <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="CO₂ évité par jour">
        <h2 className="mb-4 font-semibold text-[#0F1B2D]">CO₂ évité par jour</h2>
        <WeeklyChart days={data.weekly.days} />
      </section>

      {/* Objectif mensuel */}
      <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="Objectif mensuel">
        <MonthlyGoal {...data.monthly} />
      </section>

      {/* Répartition par mode */}
      <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="Répartition des trajets">
        <h2 className="mb-1 font-semibold text-[#0F1B2D]">Répartition de vos trajets</h2>
        <p className="mb-3 text-sm text-[#6B7280]">
          {totalKmDoux} km parcourus en mobilité douce ce mois-ci
        </p>
        <ModeBreakdown breakdown={data.breakdown} />
      </section>
    </div>
  )
}
