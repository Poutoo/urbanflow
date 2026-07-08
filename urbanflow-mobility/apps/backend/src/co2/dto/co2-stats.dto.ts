export interface WeeklyDay {
  label: string // "L", "M", "M", "J", "V", "S", "D"
  date: string // "2026-07-08"
  co2SavedKg: number
}

export interface WeeklyStats {
  days: WeeklyDay[]
  totalWeekKg: number
}

export interface MonthlyProgress {
  savedKg: number
  goalKg: number
  progressPercent: number
  remainingKg: number
}

export interface ModeBreakdown {
  mode: string
  distanceKm: number
  count: number
  percentage: number
}

export interface Co2Summary {
  weekly: WeeklyStats
  monthly: MonthlyProgress
  breakdown: ModeBreakdown[]
}
