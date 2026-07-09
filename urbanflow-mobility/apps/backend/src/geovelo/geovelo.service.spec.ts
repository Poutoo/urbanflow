import { Test } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { of, throwError } from 'rxjs'
import { GeoveloService } from './geovelo.service'

const FROM = { lat: 48.8566, lng: 2.3522 }
const TO = { lat: 48.833, lng: 2.3708 }

// Polyline encodée réelle (précision 6) d'un court tracé Paris, capturée depuis l'API
const REAL_GEOMETRY = 'id_e|AqwqnCy@nFa@]UQ'

function geoveloResponse(geometry = REAL_GEOMETRY, duration = 1072, total = 3585) {
  return {
    data: [
      {
        duration,
        distances: { total },
        sections: [{ transportMode: 'BIKE', duration, geometry }],
      },
    ],
  }
}

describe('GeoveloService', () => {
  let service: GeoveloService
  let httpPost: jest.Mock

  beforeEach(async () => {
    httpPost = jest.fn().mockReturnValue(of(geoveloResponse()))

    const module = await Test.createTestingModule({
      providers: [
        GeoveloService,
        { provide: HttpService, useValue: { post: httpPost } },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'NAVITIA_BASE_URL'
                ? 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia'
                : 'fake-key',
          },
        },
      ],
    }).compile()

    service = module.get(GeoveloService)
  })

  it('retourne un trajet vélo avec durée, distance et tracé décodé', async () => {
    const route = await service.getBikeRoute(FROM, TO)
    expect(route?.durationSec).toBe(1072)
    expect(route?.distanceKm).toBeCloseTo(3.585)
    expect(route?.coordinates.length).toBeGreaterThanOrEqual(2)
  })

  it('décode la polyline précision 6 en coordonnées [lng, lat] cohérentes (Paris)', async () => {
    const route = await service.getBikeRoute(FROM, TO)
    const [lng, lat] = route!.coordinates[0]!
    expect(lng).toBeGreaterThan(2) // longitude Paris ~2.3
    expect(lng).toBeLessThan(3)
    expect(lat).toBeGreaterThan(48) // latitude Paris ~48.85
    expect(lat).toBeLessThan(49)
  })

  it('construit l URL Geovelo à partir de NAVITIA_BASE_URL', async () => {
    await service.getBikeRoute(FROM, TO)
    const calledUrl: string = httpPost.mock.calls[0][0]
    expect(calledUrl).toContain('/marketplace/computedroutes')
  })

  it('envoie le mode BSS (Vélib) dans le corps', async () => {
    await service.getBikeRoute(FROM, TO)
    const body = httpPost.mock.calls[0][1]
    expect(body.bikeDetails.bikeType).toBe('BSS')
    expect(body.waypoints).toHaveLength(2)
  })

  it('retourne null si l API est indisponible (non bloquant)', async () => {
    httpPost.mockReturnValue(throwError(() => new Error('timeout')))
    const route = await service.getBikeRoute(FROM, TO)
    expect(route).toBeNull()
  })

  it('retourne null si la réponse ne contient pas de géométrie', async () => {
    httpPost.mockReturnValue(of({ data: [{ duration: 100, distances: { total: 500 }, sections: [{ transportMode: 'BIKE', duration: 100 }] }] }))
    const route = await service.getBikeRoute(FROM, TO)
    expect(route).toBeNull()
  })
})
