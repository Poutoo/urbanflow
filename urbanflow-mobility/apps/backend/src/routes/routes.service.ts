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
import { GbfsService, GbfsStation } from '../gbfs/gbfs.service'
import { Co2Service } from '../co2/co2.service'
import { CacheService } from '../cache/cache.service'
import { SearchRoutesDto } from './dto/search-routes.dto'
import { SearchRoutesResult, RouteResult, RecommendedBikeStation } from './interfaces/route.interface'

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
      const navSections = sections.map((s) => this.toNavitiaSection(s))
      // Navitia n'inclut pas toujours distances.total → fallback : somme des longueurs de sections
      let distanceKm = ((journey['distances'] as Record<string, number> | undefined)?.['total'] ?? 0) / 1000
      if (distanceKm === 0) {
        distanceKm = navSections.reduce((sum, s) => sum + (s.length ?? 0), 0) / 1000
      }
      const co2Kg = this.co2.calculateJourneyCo2(navSections)
      return {
        id: crypto.randomUUID(),
        duration: journey['duration'] as number,
        departureTime: journey['departure_date_time'] as string,
        arrivalTime: journey['arrival_date_time'] as string,
        distanceKm,
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

    // On dirige l'utilisateur vers un Vélib' pour le trajet écologique :
    // station la plus proche du départ ayant des vélos disponibles.
    const bikeStation = this.pickRecommendedBikeStation(dto.fromLat, dto.fromLng, nearbyStations)
    if (result.ecological && bikeStation) {
      result.ecological = { ...result.ecological, recommendedBikeStation: bikeStation }
    }

    await this.cache.set(cacheKey, result, 120)
    return result
  }

  /** Station Vélib' la plus proche du départ avec au moins un vélo disponible */
  private pickRecommendedBikeStation(
    fromLat: number,
    fromLng: number,
    stations: GbfsStation[],
  ): RecommendedBikeStation | null {
    // stations est déjà trié par distance croissante (GbfsService) → le premier
    // avec des vélos dispo est le plus proche.
    const station = stations.find((s) => s.bikesAvailable > 0)
    if (!station) return null
    const distanceM = Math.round(
      haversineDistance([
        [fromLng, fromLat],
        [station.lng, station.lat],
      ]),
    )
    return { station, distanceM }
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

  // Le trajet écologique tolère au plus +50% de temps vs le plus rapide.
  // Au-delà, un trajet "vert" mais beaucoup plus long est écarté : personne
  // n'accepte 2h de marche pour économiser quelques grammes de CO₂.
  private static readonly ECO_TIME_TOLERANCE = 1.5

  // Pondération du score écologique : le CO₂ prime (0.7), le temps pénalise
  // les détours (0.3). Les deux termes sont normalisés sur le pool retenu.
  private static readonly ECO_CO2_WEIGHT = 0.7
  private static readonly ECO_TIME_WEIGHT = 0.3

  /**
   * Choix "écologique" = meilleur compromis CO₂ / temps, pas le CO₂ minimum
   * absolu (qui donnerait toujours la marche seule, même 2h plus longue).
   *
   *   1. On écarte les trajets déraisonnablement longs (> 1.5× le plus rapide).
   *   2. Parmi les restants, on minimise un score pondéré CO₂ + temps.
   *
   * Résultat : vélo / métro combinés gagnent sur les trajets réalistes ;
   * la marche seule ne l'emporte que sur les courtes distances.
   */
  private pickMostEcological(journeys: RouteResult[]): RouteResult | null {
    if (journeys.length === 0) return null

    const fastestDuration = Math.min(...journeys.map((j) => j.duration))
    const timeCap = fastestDuration * RoutesService.ECO_TIME_TOLERANCE
    const acceptable = journeys.filter((j) => j.duration <= timeCap)
    const pool = acceptable.length > 0 ? acceptable : journeys

    // Normalisation sur le pool pour rendre CO₂ (kg) et temps (s) comparables
    const maxCo2 = Math.max(...pool.map((j) => j.co2Kg), Number.EPSILON)
    const minDur = Math.min(...pool.map((j) => j.duration))
    const maxDur = Math.max(...pool.map((j) => j.duration))
    const durSpan = maxDur - minDur || 1

    const score = (j: RouteResult) =>
      RoutesService.ECO_CO2_WEIGHT * (j.co2Kg / maxCo2) +
      RoutesService.ECO_TIME_WEIGHT * ((j.duration - minDur) / durSpan)

    return [...pool].sort((a, b) => score(a) - score(b))[0] ?? null
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
