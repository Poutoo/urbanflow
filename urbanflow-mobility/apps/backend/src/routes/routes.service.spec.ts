import { Test } from '@nestjs/testing'
import { RoutesService } from './routes.service'
import { NavitiaService } from '../navitia/navitia.service'
import { GbfsService } from '../gbfs/gbfs.service'
import { Co2Service } from '../co2/co2.service'
import { GeoveloService } from '../geovelo/geovelo.service'
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
  let geoveloGet: jest.Mock
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
    geoveloGet = jest.fn().mockResolvedValue(null) // par défaut : pas de vélo → fallback Navitia
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
        { provide: GeoveloService, useValue: { getBikeRoute: geoveloGet } },
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

  it('selectionne le journey le plus ecologique (co2 min) sans trajet Geovelo', async () => {
    // geovelo renvoie null par defaut → fallback compromis CO2/temps Navitia
    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.duration).toBe(900)
  })

  it('utilise le vrai trajet velo Geovelo comme option ecologique quand disponible', async () => {
    co2Calculate.mockReturnValue(0.02) // valeur par defaut pour le calcul CO2 du velo
    geoveloGet.mockResolvedValue({
      durationSec: 1072,
      distanceKm: 3.585,
      coordinates: [
        [2.3522, 48.8566],
        [2.3708, 48.833],
      ],
    })

    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.duration).toBe(1072)
    expect(result.ecological?.sections).toHaveLength(1)
    expect(result.ecological?.sections[0]?.mode).toBe('bicycle')
    expect(result.ecological?.sections[0]?.coordinates).toHaveLength(2)
  })

  it('ignore le trajet velo trop long (plafond 30 min) et retombe sur Navitia', async () => {
    geoveloGet.mockResolvedValue({
      durationSec: 45 * 60, // 45 min de velo → au-dela du plafond
      distanceKm: 12,
      coordinates: [
        [2.3522, 48.8566],
        [2.3708, 48.833],
      ],
    })

    const result = await service.searchRoutes(DTO)
    // Fallback compromis CO2/temps Navitia (journey co2 min = 900s)
    expect(result.ecological?.duration).toBe(900)
    expect(result.ecological?.sections[0]?.mode).not.toBe('bicycle')
  })

  it('accepte le trajet velo juste sous le plafond (30 min)', async () => {
    co2Calculate.mockReturnValue(0.02)
    geoveloGet.mockResolvedValue({
      durationSec: 30 * 60, // pile au plafond → accepte
      distanceKm: 7,
      coordinates: [
        [2.3522, 48.8566],
        [2.3708, 48.833],
      ],
    })

    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.duration).toBe(30 * 60)
    expect(result.ecological?.sections[0]?.mode).toBe('bicycle')
  })

  it('appelle Geovelo pour le trajet velo', async () => {
    await service.searchRoutes(DTO)
    expect(geoveloGet).toHaveBeenCalledWith(
      { lat: DTO.fromLat, lng: DTO.fromLng },
      { lat: DTO.toLat, lng: DTO.toLng },
    )
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

  it('envoie a Navitia l heure locale de Paris (pas UTC)', async () => {
    await service.searchRoutes(DTO)
    const datetimeArg: string = navitiaGet.mock.calls[0][2]

    // Heure attendue = maintenant en Europe/Paris (au format YYYYMMDDTHHMM, secondes ignorees)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date())
    const g = (t: string) => parts.find((p) => p.type === t)!.value
    const expectedPrefix = `${g('year')}${g('month')}${g('day')}T${g('hour')}${g('minute')}`

    expect(datetimeArg).toMatch(/^\d{8}T\d{6}$/)
    expect(datetimeArg.startsWith(expectedPrefix)).toBe(true)
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

  it('attache au trajet ecologique la station Velib la plus proche avec des velos', async () => {
    gbfsGet.mockResolvedValue([
      { id: 's1', name: 'Station vide', lat: 48.87, lng: 2.34, bikesAvailable: 0, docksAvailable: 5 },
      { id: 's2', name: 'Station OK', lat: 48.871, lng: 2.341, bikesAvailable: 4, docksAvailable: 2 },
    ])
    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.recommendedBikeStation?.station.id).toBe('s2')
    expect(result.ecological?.recommendedBikeStation?.distanceM).toBeGreaterThan(0)
  })

  it('n attache aucune station si aucune n a de velo disponible', async () => {
    gbfsGet.mockResolvedValue([
      { id: 's1', name: 'Station vide', lat: 48.87, lng: 2.34, bikesAvailable: 0, docksAvailable: 5 },
    ])
    const result = await service.searchRoutes(DTO)
    expect(result.ecological?.recommendedBikeStation).toBeUndefined()
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
