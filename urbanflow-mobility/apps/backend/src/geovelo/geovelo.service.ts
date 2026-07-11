import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

interface Coordinates {
  lat: number
  lng: number
}

export interface GeoveloBikeRoute {
  durationSec: number
  distanceKm: number
  coordinates: number[][] // [lng, lat][] — tracé cyclable réel
}

interface GeoveloSection {
  transportMode: string
  duration: number
  geometry?: string
}

interface GeoveloRouteResponse {
  duration: number
  distances?: { total?: number }
  sections?: GeoveloSection[]
}

const DEFAULT_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/computedroutes'

@Injectable()
export class GeoveloService {
  private readonly logger = new Logger(GeoveloService.name)
  private readonly url: string
  private readonly apiKey: string

  constructor(
    private http: HttpService,
    config: ConfigService,
  ) {
    // Même plateforme PRIM que Navitia : on dérive l'URL Geovelo et on réutilise la clé
    const navitiaBase = config.get<string>('NAVITIA_BASE_URL') ?? ''
    const derived = navitiaBase.replace(/\/v2\/navitia\/?$/, '/computedroutes')
    this.url = derived.endsWith('/computedroutes') ? derived : DEFAULT_URL
    this.apiKey = config.get<string>('NAVITIA_API_KEY') ?? ''
  }

  /**
   * Itinéraire vélo en libre-service (Vélib') via l'API Geovelo de PRIM.
   * Retourne le tracé cyclable réel, ou null si l'API est indisponible (non bloquant).
   */
  async getBikeRoute(from: Coordinates, to: Coordinates): Promise<GeoveloBikeRoute | null> {
    const body = {
      waypoints: [
        { latitude: from.lat, longitude: from.lng, title: 'Départ' },
        { latitude: to.lat, longitude: to.lng, title: 'Arrivée' },
      ],
      bikeDetails: { profile: 'MEDIAN', bikeType: 'BSS', averageSpeed: 15 },
      transportModes: ['BIKE'],
    }

    try {
      const res = await firstValueFrom(
        this.http.post<GeoveloRouteResponse | GeoveloRouteResponse[]>(
          `${this.url}?geometry=true&single_result=false&instructions=false&elevations=false`,
          body,
          { headers: { apikey: this.apiKey, 'Content-Type': 'application/json' } },
        ),
      )

      const route = Array.isArray(res.data) ? res.data[0] : res.data
      const section = route?.sections?.[0]
      if (!route || !section?.geometry) return null

      const coordinates = this.decodePolyline(section.geometry)
      if (coordinates.length < 2) return null

      return {
        durationSec: route.duration,
        distanceKm: (route.distances?.total ?? 0) / 1000,
        coordinates,
      }
    } catch (err) {
      this.logger.warn(`Geovelo indisponible, pas de trajet vélo : ${(err as Error).message}`)
      return null
    }
  }

  /**
   * Décode une polyline encodée (algorithme Google). Geovelo utilise une
   * précision de 6 décimales. Retourne des paires [lng, lat] (convention interne).
   */
  private decodePolyline(encoded: string, precision = 6): number[][] {
    const factor = Math.pow(10, precision)
    let index = 0
    let lat = 0
    let lng = 0
    const coords: number[][] = []

    while (index < encoded.length) {
      let result = 0
      let shift = 0
      let b: number
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      lat += result & 1 ? ~(result >> 1) : result >> 1

      result = 0
      shift = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      lng += result & 1 ? ~(result >> 1) : result >> 1

      coords.push([lng / factor, lat / factor])
    }

    return coords
  }
}
