import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common'
import * as request from 'supertest'
import { Co2Controller } from './co2.controller'
import { Co2DashboardService } from './co2-dashboard.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

const MOCK_SUMMARY = {
  weekly: { days: [], totalWeekKg: 0 },
  monthly: { savedKg: 0, goalKg: 40, progressPercent: 0, remainingKg: 40 },
  breakdown: [],
}

const mockDashboard = {
  recordJourney: jest.fn().mockResolvedValue(undefined),
  getWeeklyStats: jest.fn().mockResolvedValue(MOCK_SUMMARY.weekly),
  getMonthlyProgress: jest.fn().mockResolvedValue(MOCK_SUMMARY.monthly),
  getModeBreakdown: jest.fn().mockResolvedValue(MOCK_SUMMARY.breakdown),
}

// Injecte un user JWT fictif dans la requête
class PassGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<{ user: { sub: string; email: string } }>()
    req.user = { sub: 'user-1', email: 'test@example.com' }
    return true
  }
}

class DenyGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return false
  }
}

async function buildApp(guard: CanActivate) {
  const module = await Test.createTestingModule({
    controllers: [Co2Controller],
    providers: [{ provide: Co2DashboardService, useValue: mockDashboard }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guard)
    .compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  await app.init()
  return app
}

const VALID_BODY = {
  co2SavedKg: 2,
  co2EmittedKg: 0.5,
  distanceKm: 8,
  primaryMode: 'metro',
  strategy: 'ecological',
  durationMin: 25,
}

describe('Co2Controller (integration)', () => {
  let app: INestApplication
  let appNoAuth: INestApplication

  beforeAll(async () => {
    app = await buildApp(new PassGuard())
    appNoAuth = await buildApp(new DenyGuard())
  })

  afterAll(async () => {
    await app.close()
    await appNoAuth.close()
  })

  beforeEach(() => jest.clearAllMocks())

  describe('POST /co2/record', () => {
    it('sans JWT → 403 (guard refuse)', async () => {
      await request(appNoAuth.getHttpServer()).post('/co2/record').send(VALID_BODY).expect(403)
    })

    it('avec co2SavedKg négatif → 400', async () => {
      await request(app.getHttpServer())
        .post('/co2/record')
        .send({ ...VALID_BODY, co2SavedKg: -1 })
        .expect(400)
    })

    it('avec strategy invalide → 400', async () => {
      await request(app.getHttpServer())
        .post('/co2/record')
        .send({ ...VALID_BODY, strategy: 'teleportation' })
        .expect(400)
    })

    it('cas nominal → 201, recordJourney appelé avec le userId du JWT', async () => {
      await request(app.getHttpServer()).post('/co2/record').send(VALID_BODY).expect(201)
      expect(mockDashboard.recordJourney).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ strategy: 'ecological' }),
      )
    })

    it('co2SavedKg = 0 accepté (trajet rapide sans gain) → 201', async () => {
      await request(app.getHttpServer())
        .post('/co2/record')
        .send({ ...VALID_BODY, co2SavedKg: 0 })
        .expect(201)
    })
  })

  describe('GET /co2/summary', () => {
    it('sans JWT → 403', async () => {
      await request(appNoAuth.getHttpServer()).get('/co2/summary').expect(403)
    })

    it('retourne weekly + monthly + breakdown', async () => {
      const res = await request(app.getHttpServer()).get('/co2/summary').expect(200)
      expect(res.body).toHaveProperty('weekly')
      expect(res.body).toHaveProperty('monthly')
      expect(res.body).toHaveProperty('breakdown')
    })
  })

  describe('GET /co2/weekly | monthly | breakdown', () => {
    it('GET /co2/weekly → 200', async () => {
      await request(app.getHttpServer()).get('/co2/weekly').expect(200)
      expect(mockDashboard.getWeeklyStats).toHaveBeenCalledWith('user-1')
    })

    it('GET /co2/monthly → 200', async () => {
      await request(app.getHttpServer()).get('/co2/monthly').expect(200)
      expect(mockDashboard.getMonthlyProgress).toHaveBeenCalledWith('user-1')
    })

    it('GET /co2/breakdown → 200', async () => {
      await request(app.getHttpServer()).get('/co2/breakdown').expect(200)
      expect(mockDashboard.getModeBreakdown).toHaveBeenCalledWith('user-1')
    })
  })
})
