import { Injectable } from '@nestjs/common'
import { NavitiaService } from '../navitia/navitia.service'

function haversineDistance(coords: number[][]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1]!
    const [lon2, lat2] = coords[i]!
    const R = 6_371_000
    const φ1 = (lat1! * Math.PI) / 180
    const φ2 = (lat2! * Math.PI) / 180
    const Δφ = ((lat2! - lat1!) * Math.PI) / 180
    const Δλ = ((lon2! - lon1!) * Math.PI) / 180
    const a =
      Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total
}
import { GbfsService } from '../gbfs/gbfs.service'
import { Co2Service } from '../co2/co2.service'
import { CacheService } from '../cache/cache.service'
import { SearchRoutesDto } from './dto/search-routes.dto'
import { SearchRoutesResult, RouteResult } from './interfaces/route.interface'

@Injectable()
export class RoutesService {
  constructor(
    private navitia: NavitiaService,
    private gbfs: GbfsService,
    private co2: Co2Service,
    private cache: CacheService,
  ) {}

  async searchRoutes(dto: SearchRoutesDto): Promise<SearchRoutesResult> {
    const cacheKey = `routes:${dto.fromLat},${dto.fromLng}:${dto.toLat},${dto.toLng}:${dto.departureTime ?? 'now'}`
    const cached = await this.cache.get<SearchRoutesResult>(cacheKey)
    if (cached) return cached

    const datetime = dto.departureTime
      ? new Date(dto.departureTime).toISOString().replace(/[-:]/g, '').split('.')[0]
      : new Date().toISOString().replace(/[-:]/g, '').split('.')[0]

    const [journeys, nearbyStations] = await Promise.all([
      this.navitia.getJourneys(
        { lat: dto.fromLat, lng: dto.fromLng },
        { lat: dto.toLat, lng: dto.toLng },
        datetime,
      ),
      this.gbfs.getNearbyStations(dto.fromLat, dto.fromLng),
    ])

    const enriched = (journeys as Record<string, unknown>[]).map((journey) => {
      const sections = journey['sections'] as Record<string, unknown>[]
      const distanceKm = ((journey['distances'] as Record<string, number> | undefined)?.['total'] ?? 0) / 1000
      const co2Kg = this.co2.calculateJourneyCo2(sections.map((s) => this.toNavitiaSection(s)))
      return {
        id: crypto.randomUUID(),
        duration: journey['duration'] as number,
        departureTime: journey['departure_date_time'] as string,
        arrivalTime: journey['arrival_date_time'] as string,
        co2Kg,
        co2SavedKg: this.co2.calculateCo2Saved(co2Kg, distanceKm),
        sections: this.formatSections(sections),
        isPmrAccessible: this.checkPmrAccessibility(sections),
      }
    })

    const result: SearchRoutesResult = {
      fast: this.pickFastest([...enriched]),
      ecological: this.pickMostEcological([...enriched]),
      economic: this.pickCheapest([...enriched]),
      nearbyBikeStations: nearbyStations,
    }

    await this.cache.set(cacheKey, result, 120)
    return result
  }

  private toNavitiaSection(s: Record<string, unknown>) {
    const geojson = s['geojson'] as Record<string, unknown> | undefined
    const coords = (geojson?.['coordinates'] as number[][] | undefined) ?? []

    // Navitia fournit `length` pour street_network mais pas pour public_transport.
    // Fallback : distance Haversine sur les coordonnées GeoJSON.
    let length = s['length'] as number | undefined
    if ((!length || length === 0) && coords.length >= 2) {
      length = haversineDistance(coords)
    }

    return {
      type: s['type'] as string,
      display_informations: s['display_informations'] as { physical_mode?: string } | undefined,
      length,
    }
  }

  private getStopCoord(point: Record<string, unknown> | undefined): [number, number] | null {
    const sp = (
      (point?.['stop_point'] ?? point?.['address']) as Record<string, unknown> | undefined
    )
    const coord = sp?.['coord'] as { lat?: string; lon?: string } | undefined
    if (!coord?.lat || !coord?.lon) return null
    return [parseFloat(coord.lon), parseFloat(coord.lat)]
  }

  private pickFastest(journeys: RouteResult[]): RouteResult | null {
    return journeys.sort((a, b) => a.duration - b.duration)[0] ?? null
  }

  private pickMostEcological(journeys: RouteResult[]): RouteResult | null {
    return journeys.sort((a, b) => a.co2Kg - b.co2Kg)[0] ?? null
  }

  private pickCheapest(journeys: RouteResult[]): RouteResult | null {
    return journeys.sort((a, b) => a.sections.length - b.sections.length)[0] ?? null
  }

  private checkPmrAccessibility(sections: Record<string, unknown>[]): boolean {
    const publicTransport = sections.filter((s) => s['type'] === 'public_transport')
    // Trajet sans transport en commun (ex: marche seule) → toujours accessible
    if (publicTransport.length === 0) return true
    // Navitia signale l'accessibilité via display_informations.equipments: ["has_wheelchair_boarding"]
    return publicTransport.every((s) => {
      const info = s['display_informations'] as Record<string, unknown> | undefined
      const equipments = (info?.['equipments'] as string[] | undefined) ?? []
      return equipments.includes('has_wheelchair_boarding')
    })
  }

  private formatSections(sections: Record<string, unknown>[]) {
    return sections
      .filter((s) => s['type'] !== 'waiting')
      .map((s) => {
        const info = s['display_informations'] as Record<string, unknown> | undefined
        const from = s['from'] as Record<string, unknown> | undefined
        const to = s['to'] as Record<string, unknown> | undefined
        const geojson = s['geojson'] as Record<string, unknown> | undefined

        const rawCoords = (geojson?.['coordinates'] as number[][] | undefined) ?? []
        const fromCoord = this.getStopCoord(from)
        const toCoord = this.getStopCoord(to)
        const estimated = rawCoords.length < 2
        const coordinates = estimated && fromCoord && toCoord ? [fromCoord, toCoord] : rawCoords

        return {
          type: s['type'] as string,
          mode: (info?.['commercial_mode'] as string) ?? (s['type'] as string),
          line: info?.['label'] as string | undefined,
          duration: s['duration'] as number,
          from:
            (((from?.['stop_point'] as Record<string, unknown> | undefined)?.['name']) as string | undefined) ??
            (((from?.['address'] as Record<string, unknown> | undefined)?.['name']) as string | undefined),
          to:
            (((to?.['stop_point'] as Record<string, unknown> | undefined)?.['name']) as string | undefined) ??
            (((to?.['address'] as Record<string, unknown> | undefined)?.['name']) as string | undefined),
          coordinates,
          estimated,
        }
      })
  }
}
