import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common'
import * as request from 'supertest'
import { RoutesController } from './routes.controller'
import { RoutesService } from './routes.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

const MOCK_RESULT = { fast: null, ecological: null, economic: null, nearbyBikeStations: [] }

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
    controllers: [RoutesController],
    providers: [
      { provide: RoutesService, useValue: { searchRoutes: jest.fn().mockResolvedValue(MOCK_RESULT) } },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guard)
    .compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.init()
  return app
}

describe('RoutesController (integration)', () => {
  let appWithAuth: INestApplication
  let appNoAuth: INestApplication

  beforeAll(async () => {
    appWithAuth = await buildApp(new DenyGuard())
    appNoAuth = await buildApp(new PassGuard())
  })

  afterAll(async () => {
    await appWithAuth.close()
    await appNoAuth.close()
  })

  it('POST /routes/search sans JWT -> 403 (guard refuse)', async () => {
    await request(appWithAuth.getHttpServer())
      .post('/routes/search')
      .send({ fromLat: 48.87, fromLng: 2.34, toLat: 48.86, toLng: 2.36 })
      .expect(403)
  })

  it('POST /routes/search avec coordonnees invalides -> 400', async () => {
    await request(appNoAuth.getHttpServer())
      .post('/routes/search')
      .send({ fromLat: 'invalide', fromLng: 2.34, toLat: 48.86, toLng: 2.36 })
      .expect(400)
  })

  it('POST /routes/search avec body vide -> 400', async () => {
    await request(appNoAuth.getHttpServer())
      .post('/routes/search')
      .send({})
      .expect(400)
  })

  it('POST /routes/search avec coordonnees valides -> 200', async () => {
    await request(appNoAuth.getHttpServer())
      .post('/routes/search')
      .send({ fromLat: 48.87, fromLng: 2.34, toLat: 48.86, toLng: 2.36 })
      .expect(201)
      .expect(MOCK_RESULT)
  })
})
