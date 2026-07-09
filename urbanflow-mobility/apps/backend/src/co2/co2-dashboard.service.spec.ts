import { Test } from '@nestjs/testing'
import { Co2DashboardService, ECO_MOBILE_THRESHOLD_KG } from './co2-dashboard.service'
import { PrismaService } from '../prisma/prisma.service'
import { RecordJourneyDto } from './dto/record-journey.dto'

const USER_ID = 'user-1'

function makeDto(overrides: Partial<RecordJourneyDto> = {}): RecordJourneyDto {
  return {
    co2SavedKg: 2,
    co2EmittedKg: 0.5,
    distanceKm: 8,
    primaryMode: 'metro',
    strategy: 'ecological',
    durationMin: 25,
    ...overrides,
  }
}

// Construit un enregistrement Co2Record fictif à une date donnée
function record(date: Date, overrides: Record<string, unknown> = {}) {
  return {
    id: `rec-${Math.random()}`,
    userId: USER_ID,
    date,
    co2SavedKg: 1,
    co2EmittedKg: 0.2,
    distanceKm: 5,
    primaryMode: 'metro',
    strategy: 'ecological',
    durationMin: 15,
    createdAt: date,
    ...overrides,
  }
}

describe('Co2DashboardService', () => {
  let service: Co2DashboardService
  let prisma: {
    co2Record: { create: jest.Mock; findMany: jest.Mock }
    userProfile: { update: jest.Mock; findUnique: jest.Mock }
    $transaction: jest.Mock
  }

  // tx transmis au callback de $transaction
  let tx: {
    co2Record: { create: jest.Mock }
    userProfile: { update: jest.Mock }
  }

  beforeEach(async () => {
    tx = {
      co2Record: { create: jest.fn().mockResolvedValue({}) },
      userProfile: { update: jest.fn() },
    }

    prisma = {
      co2Record: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      userProfile: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ co2Goal: 40 }) },
      $transaction: jest.fn().mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
    }

    const module = await Test.createTestingModule({
      providers: [Co2DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(Co2DashboardService)
  })

  // ─── recordJourney ──────────────────────────────────────────────────────────

  describe('recordJourney', () => {
    it('crée un record en BDD dans une transaction', async () => {
      tx.userProfile.update.mockResolvedValue({ ecoMobileBadge: false, totalCo2SavedKg: 2 })

      await service.recordJourney(USER_ID, makeDto())

      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(tx.co2Record.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: USER_ID, co2SavedKg: 2, primaryMode: 'metro' }),
        }),
      )
    })

    it('incrémente totalCo2SavedKg sur le profil', async () => {
      tx.userProfile.update.mockResolvedValue({ ecoMobileBadge: false, totalCo2SavedKg: 5 })

      await service.recordJourney(USER_ID, makeDto({ co2SavedKg: 3 }))

      expect(tx.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          data: { totalCo2SavedKg: { increment: 3 } },
        }),
      )
    })

    it('décerne le badge Éco-mobile quand totalCo2SavedKg >= 10', async () => {
      tx.userProfile.update.mockResolvedValue({
        ecoMobileBadge: false,
        totalCo2SavedKg: ECO_MOBILE_THRESHOLD_KG,
      })

      await service.recordJourney(USER_ID, makeDto())

      // 2 updates : incrément puis attribution du badge
      expect(tx.userProfile.update).toHaveBeenCalledTimes(2)
      expect(tx.userProfile.update).toHaveBeenLastCalledWith({
        where: { userId: USER_ID },
        data: { ecoMobileBadge: true },
      })
    })

    it('ne décerne pas le badge si totalCo2SavedKg < 10', async () => {
      tx.userProfile.update.mockResolvedValue({ ecoMobileBadge: false, totalCo2SavedKg: 9.9 })

      await service.recordJourney(USER_ID, makeDto())

      expect(tx.userProfile.update).toHaveBeenCalledTimes(1)
    })

    it('ne décerne pas le badge une deuxième fois', async () => {
      tx.userProfile.update.mockResolvedValue({ ecoMobileBadge: true, totalCo2SavedKg: 50 })

      await service.recordJourney(USER_ID, makeDto())

      expect(tx.userProfile.update).toHaveBeenCalledTimes(1)
    })
  })

  // ─── getWeeklyStats ─────────────────────────────────────────────────────────

  describe('getWeeklyStats', () => {
    it('retourne 7 jours', async () => {
      const result = await service.getWeeklyStats(USER_ID)
      expect(result.days).toHaveLength(7)
      expect(result.days.every((d) => 'label' in d && 'co2SavedKg' in d)).toBe(true)
    })

    it('agrège plusieurs trajets le même jour', async () => {
      const today = new Date()
      prisma.co2Record.findMany.mockResolvedValue([
        record(today, { co2SavedKg: 1.5 }),
        record(today, { co2SavedKg: 2.5 }),
      ])

      const result = await service.getWeeklyStats(USER_ID)
      expect(result.totalWeekKg).toBeCloseTo(4)
    })

    it('retourne 0 pour les jours sans trajet', async () => {
      prisma.co2Record.findMany.mockResolvedValue([])
      const result = await service.getWeeklyStats(USER_ID)
      expect(result.totalWeekKg).toBe(0)
      expect(result.days.every((d) => d.co2SavedKg === 0)).toBe(true)
    })
  })

  // ─── getMonthlyProgress ──────────────────────────────────────────────────────

  describe('getMonthlyProgress', () => {
    it('calcule le pourcentage de progression', async () => {
      prisma.co2Record.findMany.mockResolvedValue([record(new Date(), { co2SavedKg: 20 })])
      prisma.userProfile.findUnique.mockResolvedValue({ co2Goal: 40 })

      const result = await service.getMonthlyProgress(USER_ID)
      expect(result.savedKg).toBe(20)
      expect(result.goalKg).toBe(40)
      expect(result.progressPercent).toBe(50)
      expect(result.remainingKg).toBe(20)
    })

    it('ne dépasse pas 100% même si l’objectif est dépassé', async () => {
      prisma.co2Record.findMany.mockResolvedValue([record(new Date(), { co2SavedKg: 60 })])
      prisma.userProfile.findUnique.mockResolvedValue({ co2Goal: 40 })

      const result = await service.getMonthlyProgress(USER_ID)
      expect(result.progressPercent).toBe(100)
      expect(result.remainingKg).toBe(0)
    })

    it('utilise co2Goal du profil utilisateur', async () => {
      prisma.co2Record.findMany.mockResolvedValue([record(new Date(), { co2SavedKg: 10 })])
      prisma.userProfile.findUnique.mockResolvedValue({ co2Goal: 20 })

      const result = await service.getMonthlyProgress(USER_ID)
      expect(result.goalKg).toBe(20)
      expect(result.progressPercent).toBe(50)
    })

    it('retombe sur 40 kg par défaut si le profil est absent', async () => {
      prisma.co2Record.findMany.mockResolvedValue([])
      prisma.userProfile.findUnique.mockResolvedValue(null)

      const result = await service.getMonthlyProgress(USER_ID)
      expect(result.goalKg).toBe(40)
    })
  })

  // ─── getModeBreakdown ────────────────────────────────────────────────────────

  describe('getModeBreakdown', () => {
    it('groupe les trajets par mode', async () => {
      prisma.co2Record.findMany.mockResolvedValue([
        record(new Date(), { primaryMode: 'metro', distanceKm: 10 }),
        record(new Date(), { primaryMode: 'metro', distanceKm: 10 }),
        record(new Date(), { primaryMode: 'velo', distanceKm: 5 }),
      ])

      const result = await service.getModeBreakdown(USER_ID)
      const metro = result.find((m) => m.mode === 'metro')
      const velo = result.find((m) => m.mode === 'velo')
      expect(metro?.count).toBe(2)
      expect(metro?.distanceKm).toBe(20)
      expect(velo?.count).toBe(1)
    })

    it('calcule des pourcentages dont la somme est proche de 100', async () => {
      prisma.co2Record.findMany.mockResolvedValue([
        record(new Date(), { primaryMode: 'metro', distanceKm: 30 }),
        record(new Date(), { primaryMode: 'velo', distanceKm: 10 }),
      ])

      const result = await service.getModeBreakdown(USER_ID)
      const total = result.reduce((s, m) => s + m.percentage, 0)
      expect(total).toBe(100)
    })

    it('retourne un tableau vide si aucun trajet ce mois-ci', async () => {
      prisma.co2Record.findMany.mockResolvedValue([])
      const result = await service.getModeBreakdown(USER_ID)
      expect(result).toEqual([])
    })
  })
})
