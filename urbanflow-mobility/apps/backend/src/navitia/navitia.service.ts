import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom, catchError, throwError } from 'rxjs'
import type { AxiosError } from 'axios'

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
    const url = `${this.baseUrl}/journeys`
    const response = await firstValueFrom(
      this.http
        .get<{ journeys: unknown[] }>(url, {
          params: {
            from: `${from.lng};${from.lat}`,
            to: `${to.lng};${to.lat}`,
            datetime,
            count: 5,
          },
          headers: { apikey: this.apiKey },
        })
        .pipe(
          catchError((err: AxiosError) => {
            const status = err.response?.status ?? HttpStatus.BAD_GATEWAY
            const message =
              status === HttpStatus.UNAUTHORIZED
                ? 'Clé API Navitia invalide'
                : status === HttpStatus.NOT_FOUND
                  ? 'Zone géographique non couverte par Navitia'
                  : `Erreur Navitia (${status})`
            return throwError(() => new HttpException(message, status))
          }),
        ),
    )
    return response.data.journeys ?? []
  }
}
