'use client'
import { Icon } from '@iconify/react'
import type { MonthlyProgress } from '@urbanflow/types'

/**
 * Barre de progression vers l'objectif mensuel de CO₂ économisé.
 * Grille 2 colonnes x 3 lignes : l'icône occupe la même ligne que la
 * barre de progression (ligne 2) et s'y centre verticalement — son
 * milieu tombe donc exactement sur la barre, indépendamment de la
 * hauteur du titre ou du texte d'encouragement.
 */
export function MonthlyGoal({ savedKg, goalKg, progressPercent, remainingKg }: MonthlyProgress) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-x-3 gap-y-2">
      {/* Ligne 1 : titre + valeur */}
      <div className="col-start-2 row-start-1 flex items-center justify-between">
        <span className="font-semibold text-[#0F1B2D]">Objectif mensuel</span>
        <span className="font-bold text-[#B85C00]">
          {savedKg.toFixed(1)} / {goalKg} kg
        </span>
      </div>

      {/* Ligne 2 : icône cible + barre de progression, centrées sur la même ligne */}
      <span
        className="col-start-1 row-start-2 flex h-11 w-11 items-center justify-center self-center rounded-2xl bg-[#FDF0E4] text-[#B85C00]"
        aria-hidden="true"
      >
        <Icon icon="ph:target" width={24} />
      </span>
      <div
        className="col-start-2 row-start-2 h-2 self-center overflow-hidden rounded-full bg-gray-100"
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

      {/* Ligne 3 : texte d'encouragement */}
      {remainingKg > 0 ? (
        <p className="col-start-2 row-start-3 text-sm text-[#6B7280]">
          Plus que {remainingKg.toFixed(1)} kg — vous y êtes presque 👍
        </p>
      ) : (
        <p className="col-start-2 row-start-3 text-sm font-semibold text-[#2D7D46]">
          Objectif atteint ce mois-ci ! 🎉
        </p>
      )}
    </div>
  )
}
