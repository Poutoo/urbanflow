import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RecordJourneyDto } from './dto/record-journey.dto'
import { WeeklyStats, MonthlyProgress, ModeBreakdown } from './dto/co2-stats.dto'

/** Seuil de CO₂ économisé (kg) au-delà duquel le badge Éco-mobile est décerné */
export const ECO_MOBILE_THRESHOLD_KG = 10

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

// Clé de jour en heure LOCALE (cohérente avec setHours(0,0,0,0) local).
// Ne pas utiliser toISOString() ici : le décalage UTC ferait tomber le jour
// courant hors de la fenêtre glissante pour les fuseaux à offset positif.
function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Lundi 00:00 (heure locale) de la semaine calendaire contenant la date donnée
function getMonday(d: Date): Date {
  const day = d.getDay() // 0 = dimanche, 1 = lundi, …
  const monday = new Date(d)
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(0, 0, 0, 0)
  return monday
}

@Injectable()
export class Co2DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre un trajet validé, incrémente le compteur cumulé du profil
   * et décerne le badge Éco-mobile si le seuil est atteint.
   * Transaction : si une opération échoue, tout est annulé.
   */
  async recordJourney(userId: string, dto: RecordJourneyDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.co2Record.create({
        data: {
          userId,
          co2SavedKg: dto.co2SavedKg,
          co2EmittedKg: dto.co2EmittedKg,
          distanceKm: dto.distanceKm,
          primaryMode: dto.primaryMode,
          strategy: dto.strategy,
          durationMin: dto.durationMin,
        },
      })

      const profile = await tx.userProfile.update({
        where: { userId },
        data: { totalCo2SavedKg: { increment: dto.co2SavedKg } },
      })

      if (!profile.ecoMobileBadge && profile.totalCo2SavedKg >= ECO_MOBILE_THRESHOLD_KG) {
        await tx.userProfile.update({
          where: { userId },
          data: { ecoMobileBadge: true },
        })
      }
    })
  }

  /** Stats de la semaine calendaire en cours (lundi → dimanche), agrégées par jour */
  async getWeeklyStats(userId: string): Promise<WeeklyStats> {
    const since = getMonday(new Date())

    const records = await this.prisma.co2Record.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      return {
        label: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]!,
        date: toDateKey(d),
        co2SavedKg: 0,
      }
    })

    for (const record of records) {
      const day = days.find((d) => d.date === toDateKey(record.date))
      if (day) day.co2SavedKg += record.co2SavedKg
    }

    return {
      days,
      totalWeekKg: days.reduce((sum, d) => sum + d.co2SavedKg, 0),
    }
  }

  /** Progression du mois en cours vs objectif personnel (co2Goal du profil) */
  async getMonthlyProgress(userId: string): Promise<MonthlyProgress> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [records, profile] = await Promise.all([
      this.prisma.co2Record.findMany({
        where: { userId, date: { gte: startOfMonth } },
      }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ])

    const savedKg = records.reduce((sum, r) => sum + r.co2SavedKg, 0)
    const goalKg = profile?.co2Goal ?? 40

    return {
      savedKg,
      goalKg,
      progressPercent: Math.min(100, Math.round((savedKg / goalKg) * 100)),
      remainingKg: Math.max(0, goalKg - savedKg),
    }
  }

  /** Répartition des trajets du mois en cours par mode de transport dominant */
  async getModeBreakdown(userId: string): Promise<ModeBreakdown[]> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const records = await this.prisma.co2Record.findMany({
      where: { userId, date: { gte: startOfMonth } },
    })

    const byMode = new Map<string, { distanceKm: number; count: number }>()
    let totalKm = 0

    for (const record of records) {
      const entry = byMode.get(record.primaryMode) ?? { distanceKm: 0, count: 0 }
      entry.distanceKm += record.distanceKm
      entry.count++
      byMode.set(record.primaryMode, entry)
      totalKm += record.distanceKm
    }

    return [...byMode.entries()].map(([mode, data]) => ({
      mode,
      distanceKm: Math.round(data.distanceKm),
      count: data.count,
      percentage: totalKm > 0 ? Math.round((data.distanceKm / totalKm) * 100) : 0,
    }))
  }
}
