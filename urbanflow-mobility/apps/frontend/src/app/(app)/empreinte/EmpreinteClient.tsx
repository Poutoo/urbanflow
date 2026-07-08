'use client'
import { Icon } from '@iconify/react'
import type { Co2Summary } from '@urbanflow/types'
import { useApiSwr } from '@/hooks/useApiSwr'
import { WeeklyChart } from './components/WeeklyChart'
import { MonthlyGoal } from './components/MonthlyGoal'
import { ModeBreakdown } from './components/ModeBreakdown'

function formatWeekLabel(days: Co2Summary['weekly']['days']): string {
  const first = days[0]
  if (!first) return ''
  const date = new Date(`${first.date}T00:00:00`)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
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
          <p className="text-sm text-[#6B7280]">Semaine du {formatWeekLabel(data.weekly.days)}</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-[#D4EFE1] px-3 py-1.5 text-sm font-bold text-[#1A5C33]"
          aria-label={`${data.weekly.totalWeekKg.toFixed(1)} kilogrammes de CO₂ évités cette semaine`}
        >
          <Icon icon="ph:leaf" width={15} aria-hidden="true" />
          −{data.weekly.totalWeekKg.toFixed(1)} kg
        </span>
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
