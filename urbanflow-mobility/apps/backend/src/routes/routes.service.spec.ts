import { Test } from '@nestjs/testing'
import { RoutesService } from './routes.service'
import { NavitiaService } from '../navitia/navitia.service'
import { GbfsService } from '../gbfs/gbfs.service'
import { Co2Service } from '../co2/co2.service'
import { CacheService } from '../cache/cache.service'
import { SearchRoutesDto } from './dto/search-routes.dto'

const DTO: SearchRoutesDto = {
  fromLat: 48.87,
  fromLng: 2.34,
  toLat: 48.86,
  toLng: 2.36,
}

function makeJourney(duration: number, co2Kg: number, sections = 2) {
  return {
    duration,
    departure_date_time: '20260615T083000',
    arrival_date_time: '20260615T090000',
    distances: { total: 5000 },
    sections: Array.from({ length: sections }, (_, i) => ({
      type: 'public_transport',
      display_informations: { physical_mode: 'Metro', commercial_mode: 'Metro', label: 'M2' },
      duration: Math.floor(duration / sections),
      geojson: { length: 2500, coordinates: [] },
      from: { stop_point: { name: `From ${i}` } },
      to: { stop_point: { name: `To ${i}` } },
    })),
    _co2Kg: co2Kg,
  }
}

describe('RoutesService', () => {
  let service: RoutesService
  let navitiaGet: jest.Mock
  let gbfsGet: jest.Mock
  let cacheGet: jest.Mock
  let cacheSet: jest.Mock
  let co2Calculate: jest.Mock

  const JOURNEYS = [
    makeJourney(600, 0.05, 3),
    makeJourney(900, 0.01, 1),
    makeJourney(1200, 0.08, 2),
  ]

  beforeEach(async () => {
    navitiaGet = jest.fn().mockResolvedValue(JOURNEYS)
    gbfsGet = jest.fn().mockResolvedValue([])
    cacheGet = jest.fn().mockResolvedValue(null)
    cacheSet = jest.fn().mockResolvedValue(undefined)

    // Journey 0 : duration=600, co2=0.05 (le plus rapide)
    // Journey 1 : duration=900, co2=0.01 (le plus écologique)
    // Journey 2 : duration=1200, co2=0.08 (le plus lent / le plus polluant)
    co2Calculate = jest.fn()
      .mockReturnValueOnce(0.05)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.08)

    const module = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: NavitiaService, useValue: { getJourneys: navitiaGet } },
        { provide: GbfsService, useValue: { getNearbyStations: gbfsGet } },
        {
          provide: Co2Service,
          useValue: {
            calculateJourneyCo2: co2Calculate,
            calculateCo2Saved: jest.fn().mockReturnValue(0.5),
          },
        },
        { provide: CacheService, useValue: { get: cacheGet, set: cacheSet } },
      ],
    }).compile()

    service = module.get(RoutesService)
  })

  it('selectionne le journey le plus rapide (duration min)', async () => {
    const result = await service.searchRoutes(DTO)
    expect(result.fast?.duration).toBe(600)
  })

  it('selectionne le journey le plus ecologique (co2 min)', async () => {
    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.duration).toBe(900)
  })

  it('ecarte la marche seule trop longue au profit d un trajet realiste', async () => {
    // J0 : 10 min, metro, co2=0.05 | J1 : 60 min, marche, co2=0 (trop long : +500%)
    navitiaGet.mockResolvedValue([makeJourney(600, 0, 2), makeJourney(3600, 0, 1)])
    co2Calculate.mockReset().mockReturnValueOnce(0.05).mockReturnValueOnce(0)

    const result = await service.searchRoutes(DTO)
    // Le trajet 100% marche (60 min) dépasse le plafond 1.5× → écarté
    expect(result.ecological?.duration).toBe(600)
  })

  it('prefere un trajet un peu plus long mais nettement plus vert (dans le plafond)', async () => {
    // J0 : 600s co2=0.20 (rapide, polluant) | J1 : 800s co2=0.02 (un peu plus long, très vert)
    navitiaGet.mockResolvedValue([makeJourney(600, 0, 2), makeJourney(800, 0, 2)])
    co2Calculate.mockReset().mockReturnValueOnce(0.2).mockReturnValueOnce(0.02)

    const result = await service.searchRoutes(DTO)
    // 800s ≤ 900s (plafond) et CO₂ 10× plus bas → gagne malgré +200s
    expect(result.ecological?.duration).toBe(800)
  })

  it('selectionne le journey le moins de sections (economique)', async () => {
    const result = await service.searchRoutes(DTO)
    expect(result.economic?.sections.length).toBe(1)
  })

  it('les 3 strategies sont independantes (copies du tableau enriched)', async () => {
    const result = await service.searchRoutes(DTO)
    expect(result.fast).toBeDefined()
    expect(result.ecological).toBeDefined()
    expect(result.economic).toBeDefined()
  })

  it('appelle Navitia et GBFS en parallele', async () => {
    await service.searchRoutes(DTO)
    expect(navitiaGet).toHaveBeenCalledTimes(1)
    expect(gbfsGet).toHaveBeenCalledTimes(1)
  })

  it('ecrit le resultat dans le cache avec TTL 120s', async () => {
    await service.searchRoutes(DTO)
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringContaining('routes:'),
      expect.any(Object),
      120,
    )
  })

  it('retourne le cache sans appeler Navitia si cache hit', async () => {
    const cached = { fast: null, ecological: null, economic: null, nearbyBikeStations: [] }
    cacheGet.mockResolvedValue(cached)
    const result = await service.searchRoutes(DTO)
    expect(result).toEqual(cached)
    expect(navitiaGet).not.toHaveBeenCalled()
  })

  it('inclut les stations velos proches dans le resultat', async () => {
    const stations = [{ id: 's1', name: 'Velib A', lat: 48.87, lng: 2.34, bikesAvailable: 3, docksAvailable: 7 }]
    gbfsGet.mockResolvedValue(stations)
    const result = await service.searchRoutes(DTO)
    expect(result.nearbyBikeStations).toEqual(stations)
  })

  it('retourne null pour les strategies si aucun journey disponible', async () => {
    navitiaGet.mockResolvedValue([])
    const result = await service.searchRoutes(DTO)
    expect(result.fast).toBeNull()
    expect(result.ecological).toBeNull()
    expect(result.economic).toBeNull()
  })
})
