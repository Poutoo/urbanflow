import { Test } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { of, throwError } from 'rxjs'
import { GbfsService } from './gbfs.service'
import { CacheService } from '../cache/cache.service'

const USER_LAT = 48.87
const USER_LNG = 2.34

// Stations fictives à distances croissantes depuis USER_LAT/USER_LNG
const INFO_STATIONS = [
  { station_id: 's1', name: 'Station A', lat: 48.871, lon: 2.341 }, // ~130 m
  { station_id: 's2', name: 'Station B', lat: 48.873, lon: 2.342 }, // ~350 m
  { station_id: 's3', name: 'Station C', lat: 48.876, lon: 2.345 }, // ~700 m — hors rayon
  { station_id: 's4', name: 'Station D', lat: 48.872, lon: 2.342 }, // ~240 m
  { station_id: 's5', name: 'Station E', lat: 48.870, lon: 2.341 }, // ~100 m
  { station_id: 's6', name: 'Station F', lat: 48.871, lon: 2.343 }, // ~200 m
]

const STATUS_STATIONS = [
  { station_id: 's1', num_bikes_available: 5, num_docks_available: 10 },
  { station_id: 's2', num_bikes_available: 0, num_docks_available: 15 },
  { station_id: 's3', num_bikes_available: 3, num_docks_available: 7 },
  { station_id: 's4', num_bikes_available: 2, num_docks_available: 8 },
  { station_id: 's5', num_bikes_available: 8, num_docks_available: 2 },
  { station_id: 's6', num_bikes_available: 4, num_docks_available: 6 },
]

function makeHttpGet(infoStations = INFO_STATIONS, statusStations = STATUS_STATIONS) {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('station_information')) {
      return of({ data: { data: { stations: infoStations } } })
    }
    return of({ data: { data: { stations: statusStations } } })
  })
}

describe('GbfsService', () => {
  let service: GbfsService
  let httpGet: jest.Mock
  let cacheGet: jest.Mock
  let cacheSet: jest.Mock

  beforeEach(async () => {
    httpGet = makeHttpGet()
    cacheGet = jest.fn().mockResolvedValue(null)
    cacheSet = jest.fn().mockResolvedValue(undefined)

    const module = await Test.createTestingModule({
      providers: [
        GbfsService,
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: CacheService, useValue: { get: cacheGet, set: cacheSet } },
      ],
    }).compile()

    service = module.get(GbfsService)
  })

  it('filtre les stations hors du rayon de 400 m', async () => {
    const result = await service.getNearbyStations(USER_LAT, USER_LNG, 400)
    const ids = result.map((s) => s.id)
    expect(ids).not.toContain('s3')
  })

  it('trie les stations par distance croissante', async () => {
    const result = await service.getNearbyStations(USER_LAT, USER_LNG, 400)
    const distances = result.map((s) => service.distanceMeters(USER_LAT, USER_LNG, s.lat, s.lng))
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1])
    }
  })

  it('limite le resultat a 5 stations maximum', async () => {
    const result = await service.getNearbyStations(USER_LAT, USER_LNG, 400)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('merge correctement les disponibilites depuis station_status', async () => {
    const result = await service.getNearbyStations(USER_LAT, USER_LNG, 400)
    const stationA = result.find((s) => s.id === 's1')
    expect(stationA?.bikesAvailable).toBe(5)
    expect(stationA?.docksAvailable).toBe(10)
  })

  it('retourne le cache si present sans appeler HTTP', async () => {
    const cached = [{ id: 's1', name: 'A', lat: 48.871, lng: 2.341, bikesAvailable: 3, docksAvailable: 7 }]
    cacheGet.mockResolvedValue(cached)
    const result = await service.getNearbyStations(USER_LAT, USER_LNG)
    expect(result).toEqual(cached)
    expect(httpGet).not.toHaveBeenCalled()
  })

  it('met en cache le resultat avec TTL 30s', async () => {
    await service.getNearbyStations(USER_LAT, USER_LNG, 400)
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringContaining('gbfs:nearby:'),
      expect.any(Array),
      30,
    )
  })

  it('utilise une precision de cle cache a 1000 (environ 100m)', async () => {
    await service.getNearbyStations(USER_LAT, USER_LNG)
    const key: string = cacheSet.mock.calls[0][0]
    expect(key).toBe(`gbfs:nearby:${Math.round(USER_LAT * 1000)},${Math.round(USER_LNG * 1000)}`)
  })

  it('retourne un tableau vide si GBFS est indisponible (erreur reseau)', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Network error')))
    const result = await service.getNearbyStations(USER_LAT, USER_LNG)
    expect(result).toEqual([])
  })

  it('ne propage pas l erreur GBFS (non bloquant)', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('timeout')))
    await expect(service.getNearbyStations(USER_LAT, USER_LNG)).resolves.not.toThrow()
  })
})
