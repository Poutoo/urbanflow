import { Injectable } from '@nestjs/common'
import { NavitiaService } from '../navitia/navitia.service'
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
    const cacheKey = `routes:${dto.fromLat},${dto.fromLng}:${dto.toLat},${dto.toLng}`
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

    const enriched = (journeys as Record<string, unknown>[]).map((journey) => ({
      id: crypto.randomUUID(),
      duration: journey['duration'] as number,
      departureTime: journey['departure_date_time'] as string,
      arrivalTime: journey['arrival_date_time'] as string,
      co2Kg: this.co2.calculateJourneyCo2(
        (journey['sections'] as Record<string, unknown>[]).map(this.toNavitiaSection),
      ),
      co2SavedKg: this.co2.calculateCo2Saved(
        this.co2.calculateJourneyCo2(
          (journey['sections'] as Record<string, unknown>[]).map(this.toNavitiaSection),
        ),
        ((journey['distances'] as Record<string, number> | undefined)?.['total'] ?? 0) / 1000,
      ),
      sections: this.formatSections(journey['sections'] as Record<string, unknown>[]),
      isPmrAccessible: this.checkPmrAccessibility(journey['sections'] as Record<string, unknown>[]),
    }))

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
    return {
      type: s['type'] as string,
      display_informations: s['display_informations'] as { physical_mode?: string } | undefined,
      geojson: s['geojson'] as { length?: number } | undefined,
    }
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
    return sections.every((s) => {
      if (s['type'] !== 'public_transport') return true
      const info = s['display_informations'] as Record<string, unknown> | undefined
      return info?.['wheelchair_boarding'] !== false
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
          coordinates: (geojson?.['coordinates'] as number[][] | undefined) ?? [],
        }
      })
  }
}
