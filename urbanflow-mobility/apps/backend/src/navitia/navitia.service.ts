import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

interface Coordinates {
  lat: number
  lng: number
}

@Injectable()
export class NavitiaService {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('NAVITIA_BASE_URL')!
    this.apiKey = this.config.get<string>('NAVITIA_API_KEY')!
  }

  async getJourneys(from: Coordinates, to: Coordinates, datetime: string): Promise<unknown[]> {
    const url = `${this.baseUrl}/coverage/fr-idf/journeys`
    const response = await firstValueFrom(
      this.http.get(url, {
        params: {
          from: `${from.lng};${from.lat}`,
          to: `${to.lng};${to.lat}`,
          datetime,
          count: 5,
        },
        headers: { Authorization: this.apiKey },
      }),
    )
    return (response.data.journeys as unknown[]) ?? []
  }
}
