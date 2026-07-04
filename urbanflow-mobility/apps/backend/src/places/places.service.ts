import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom, of, catchError } from 'rxjs'

export interface PlaceSuggestion {
  name: string
  lat: number
  lng: number
  type: 'stop_area' | 'address' | 'poi'
}

interface NavitiaCoord {
  lat?: string
  lon?: string
}

interface NavitiaPlace {
  name: string
  embedded_type: string
  stop_area?: { coord?: NavitiaCoord; name?: string }
  address?: { coord?: NavitiaCoord; name?: string }
  poi?: { coord?: NavitiaCoord; name?: string }
}

@Injectable()
export class PlacesService {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('NAVITIA_BASE_URL')!
    this.apiKey = this.config.get<string>('NAVITIA_API_KEY')!
  }

  async searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    const q = query.trim()
    if (q.length < 2) return []

    const response = await firstValueFrom(
      this.http
        .get<{ places: NavitiaPlace[] }>(`${this.baseUrl}/places`, {
          params: { q, count: 7 },
          headers: { apikey: this.apiKey },
        })
        .pipe(catchError(() => of({ data: { places: [] as NavitiaPlace[] } }))),
    )

    return response.data.places
      .map((p): PlaceSuggestion | null => {
        const inner = p.stop_area ?? p.address ?? p.poi
        const coord = inner?.coord
        if (!coord?.lat || !coord?.lon) return null
        return {
          name: p.name,
          lat: parseFloat(coord.lat),
          lng: parseFloat(coord.lon),
          type: (p.embedded_type as PlaceSuggestion['type']) ?? 'address',
        }
      })
      .filter((s): s is PlaceSuggestion => s !== null)
  }
}
