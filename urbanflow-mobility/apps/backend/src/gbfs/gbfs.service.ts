import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { CacheService } from '../cache/cache.service'

export interface GbfsStation {
  id: string
  name: string
  lat: number
  lng: number
  bikesAvailable: number
  docksAvailable: number
}

@Injectable()
export class GbfsService {
  private readonly logger = new Logger(GbfsService.name)

  private readonly STATIONS_URL =
    'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_status.json'
  private readonly INFO_URL =
    'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_information.json'

  constructor(
    private http: HttpService,
    private cache: CacheService,
  ) {}

  async getNearbyStations(lat: number, lng: number, radiusMeters = 400): Promise<GbfsStation[]> {
    const cacheKey = `gbfs:nearby:${Math.round(lat * 1000)},${Math.round(lng * 1000)}`
    const cached = await this.cache.get<GbfsStation[]>(cacheKey)
    if (cached) return cached

    try {
      type GbfsApiResponse = { data: { stations: Record<string, unknown>[] } }
      const [infoRes, statusRes] = await Promise.all([
        firstValueFrom(this.http.get<GbfsApiResponse>(this.INFO_URL)),
        firstValueFrom(this.http.get<GbfsApiResponse>(this.STATIONS_URL)),
      ])

      const stations = this.mergeAndFilterNearby(
        infoRes.data.data.stations,
        statusRes.data.data.stations,
        lat,
        lng,
        radiusMeters,
      )

      await this.cache.set(cacheKey, stations, 30)
      return stations
    } catch (err) {
      this.logger.warn(`GBFS indisponible, retour tableau vide : ${(err as Error).message}`)
      return []
    }
  }

  private mergeAndFilterNearby(
    info: Record<string, unknown>[],
    status: Record<string, unknown>[],
    lat: number,
    lng: number,
    radius: number,
  ): GbfsStation[] {
    const statusMap = new Map(status.map((s) => [s['station_id'], s]))
    return info
      .map((station) => {
        const st = statusMap.get(station['station_id']) as Record<string, unknown> | undefined
        return {
          id: station['station_id'] as string,
          name: station['name'] as string,
          lat: station['lat'] as number,
          lng: station['lon'] as number,
          bikesAvailable: (st?.['num_bikes_available'] as number) ?? 0,
          docksAvailable: (st?.['num_docks_available'] as number) ?? 0,
        }
      })
      .filter((s) => this.distanceMeters(lat, lng, s.lat, s.lng) <= radius)
      .sort((a, b) => this.distanceMeters(lat, lng, a.lat, a.lng) - this.distanceMeters(lat, lng, b.lat, b.lng))
      .slice(0, 5)
  }

  distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
