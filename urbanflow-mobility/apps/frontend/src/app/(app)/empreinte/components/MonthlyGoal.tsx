'use client'
import { Icon } from '@iconify/react'
import type { MonthlyProgress } from '@urbanflow/types'

/** Barre de progression vers l'objectif mensuel de CO₂ économisé */
export function MonthlyGoal({ savedKg, goalKg, progressPercent, remainingKg }: MonthlyProgress) {
  return (
    <div className="flex items-start gap-3">
      {/* Icône cible */}
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF0E4] text-[#B85C00]"
        aria-hidden="true"
      >
        <Icon icon="ph:target" width={24} />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#0F1B2D]">Objectif mensuel</span>
          <span className="font-bold text-[#B85C00]">
            {savedKg.toFixed(1)} / {goalKg} kg
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression vers l'objectif mensuel de CO₂ économisé"
        >
          <div
            className="h-full rounded-full bg-[#B85C00] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {remainingKg > 0 ? (
          <p className="text-sm text-[#6B7280]">
            Plus que {remainingKg.toFixed(1)} kg — vous y êtes presque 👍
          </p>
        ) : (
          <p className="text-sm font-semibold text-[#2D7D46]">Objectif atteint ce mois-ci ! 🎉</p>
        )}
      </div>
    </div>
  )
}
