import { Test } from '@nestjs/testing'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { HttpException, HttpStatus } from '@nestjs/common'
import { of, throwError } from 'rxjs'
import { NavitiaService } from './navitia.service'

const FROM = { lat: 48.87, lng: 2.34 }
const TO = { lat: 48.86, lng: 2.36 }
const DATETIME = '20260615T083000'

describe('NavitiaService', () => {
  let service: NavitiaService
  let httpGet: jest.Mock

  beforeEach(async () => {
    httpGet = jest.fn()

    const module = await Test.createTestingModule({
      providers: [
        NavitiaService,
        { provide: HttpService, useValue: { get: httpGet } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'NAVITIA_BASE_URL'
                ? 'https://prim.iledefrance-mobilites.fr/marketplace/navitia'
                : 'test-api-key',
          },
        },
      ],
    }).compile()

    service = module.get(NavitiaService)
  })

  it('passe lon;lat dans le bon ordre (lon en premier)', async () => {
    httpGet.mockReturnValue(of({ data: { journeys: [] } }))
    await service.getJourneys(FROM, TO, DATETIME)
    const params = httpGet.mock.calls[0][1].params
    expect(params.from).toBe(`${FROM.lng};${FROM.lat}`)
    expect(params.to).toBe(`${TO.lng};${TO.lat}`)
  })

  it('envoie le header apikey avec la cle API', async () => {
    httpGet.mockReturnValue(of({ data: { journeys: [] } }))
    await service.getJourneys(FROM, TO, DATETIME)
    const headers = httpGet.mock.calls[0][1].headers
    expect(headers.apikey).toBe('test-api-key')
  })

  it('retourne le tableau journeys de la reponse', async () => {
    const journeys = [{ duration: 600 }, { duration: 900 }]
    httpGet.mockReturnValue(of({ data: { journeys } }))
    const result = await service.getJourneys(FROM, TO, DATETIME)
    expect(result).toEqual(journeys)
  })

  it('retourne un tableau vide si journeys absent de la reponse', async () => {
    httpGet.mockReturnValue(of({ data: {} }))
    const result = await service.getJourneys(FROM, TO, DATETIME)
    expect(result).toEqual([])
  })

  it('throw HttpException 401 si la cle API est invalide', async () => {
    httpGet.mockReturnValue(throwError(() => ({ response: { status: 401 } })))
    await expect(service.getJourneys(FROM, TO, DATETIME)).rejects.toThrow(
      new HttpException('Clé API Navitia invalide', HttpStatus.UNAUTHORIZED),
    )
  })

  it('throw HttpException 404 si la zone est non couverte', async () => {
    httpGet.mockReturnValue(throwError(() => ({ response: { status: 404 } })))
    await expect(service.getJourneys(FROM, TO, DATETIME)).rejects.toThrow(
      new HttpException('Zone géographique non couverte par Navitia', HttpStatus.NOT_FOUND),
    )
  })

  it('throw HttpException avec le statut Navitia pour toute autre erreur', async () => {
    httpGet.mockReturnValue(throwError(() => ({ response: { status: 500 } })))
    await expect(service.getJourneys(FROM, TO, DATETIME)).rejects.toThrow(
      new HttpException('Erreur Navitia (500)', HttpStatus.INTERNAL_SERVER_ERROR),
    )
  })
})
