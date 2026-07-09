import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common'
import * as request from 'supertest'
import { GbfsController } from './gbfs.controller'
import { GbfsService } from './gbfs.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

const MOCK_STATIONS = [
  { id: 's1', name: 'Station A', lat: 48.87, lng: 2.34, bikesAvailable: 5, docksAvailable: 10 },
]

const mockGbfs = { getNearbyStations: jest.fn().mockResolvedValue(MOCK_STATIONS) }

class PassGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
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
    controllers: [GbfsController],
    providers: [{ provide: GbfsService, useValue: mockGbfs }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guard)
    .compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.init()
  return app
}

describe('GbfsController (integration)', () => {
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

  it('sans JWT → 403 (guard refuse)', async () => {
    await request(appNoAuth.getHttpServer())
      .get('/gbfs/nearby?lat=48.87&lng=2.34')
      .expect(403)
  })

  it('cas nominal → 200 avec la liste des stations', async () => {
    const res = await request(app.getHttpServer())
      .get('/gbfs/nearby?lat=48.87&lng=2.34')
      .expect(200)
    expect(res.body).toEqual(MOCK_STATIONS)
    expect(mockGbfs.getNearbyStations).toHaveBeenCalledWith(48.87, 2.34, 400)
  })

  it('respecte le radius fourni', async () => {
    await request(app.getHttpServer())
      .get('/gbfs/nearby?lat=48.87&lng=2.34&radius=800')
      .expect(200)
    expect(mockGbfs.getNearbyStations).toHaveBeenCalledWith(48.87, 2.34, 800)
  })

  it('lat non numérique → 400 (ParseFloatPipe)', async () => {
    await request(app.getHttpServer())
      .get('/gbfs/nearby?lat=abc&lng=2.34')
      .expect(400)
  })
})
