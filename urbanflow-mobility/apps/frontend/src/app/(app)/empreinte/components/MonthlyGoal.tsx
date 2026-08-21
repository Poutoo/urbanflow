'use client'
import { Icon } from '@iconify/react'
import type { MonthlyProgress } from '@urbanflow/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { getContentColor } from '@/lib/darkColors'

/**
 * Barre de progression vers l'objectif mensuel de CO₂ économisé.
 * L'icône est positionnée en absolu, ancrée sur le conteneur de la barre
 * (h-2) et centrée verticalement dessus via top-1/2 -translate-y-1/2 :
 * elle ne participe donc pas à la hauteur du bloc, ce qui garde le titre
 * et le texte d'encouragement resserrés autour de la barre.
 */
export function MonthlyGoal({ savedKg, goalKg, progressPercent, remainingKg }: MonthlyProgress) {
  const isDark = useIsDarkMode()
  const accent = getContentColor('#B85C00', isDark)
  const secondary = getContentColor('#2D7D46', isDark)

  return (
    <div className="space-y-2 pl-14">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#0F1B2D] dark:text-text-main">Objectif mensuel</span>
        <span className="font-bold" style={{ color: accent }}>
          {savedKg.toFixed(1)} / {goalKg} kg
        </span>
      </div>

      <div className="relative">
        <ProgressBar
          percent={progressPercent}
          color={accent}
          ariaLabel="Progression vers l'objectif mensuel de CO₂ économisé"
        />

        {/* Icône cible — centrée sur la barre, indépendamment de la hauteur du titre/texte */}
        <span
          className="absolute -left-14 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#FDF0E4] dark:bg-accent/10"
          style={{ color: accent }}
          aria-hidden="true"
        >
          <Icon icon="ph:target" width={24} />
        </span>
      </div>

      {remainingKg > 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-muted">
          Plus que {remainingKg.toFixed(1)} kg — vous y êtes presque 👍
        </p>
      ) : (
        <p className="text-sm font-semibold" style={{ color: secondary }}>Objectif atteint ce mois-ci ! 🎉</p>
      )}
    </div>
  )
}
