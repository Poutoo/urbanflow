'use client'

/** Badge gamification décerné après 10 kg de CO₂ économisés */
export function EcoMobileBadge({ earned }: { earned: boolean }) {
  if (!earned) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#D4EFE1] px-3 py-1.5 text-sm font-semibold text-[#1A5C33]">
      <span aria-hidden="true">🌿</span>
      Éco-mobile
    </span>
  )
}
