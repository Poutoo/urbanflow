import { Co2Service, ADEME_FACTORS } from './co2.service'

function section(type: string, physicalMode?: string, lengthM = 0) {
  return {
    type,
    display_informations: physicalMode ? { physical_mode: physicalMode } : undefined,
    geojson: { length: lengthM },
  }
}

describe('Co2Service', () => {
  let service: Co2Service

  beforeEach(() => {
    service = new Co2Service()
  })

  describe('calculateJourneyCo2', () => {
    it('retourne 0 pour un trajet marche pure', () => {
      const sections = [section('walking', undefined, 2000)]
      expect(service.calculateJourneyCo2(sections)).toBe(0)
    })

    it('retourne 0.025 kg pour un trajet velo de 5 km', () => {
      const sections = [section('bicycle', undefined, 5000)]
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(0.025, 5)
    })

    it('retourne 0.02 kg pour un trajet metro de 5 km', () => {
      const sections = [section('public_transport', 'Metro', 5000)]
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(0.02, 5)
    })

    it('normalise Tramway en tram (facteur 0.004)', () => {
      const sections = [section('public_transport', 'Tramway', 10000)]
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(0.04, 5)
    })

    it('normalise Rapid Transit en rapidtransit (facteur 0.006)', () => {
      const sections = [section('public_transport', 'Rapid Transit', 10000)]
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(0.06, 5)
    })

    it('utilise le facteur default pour un mode inconnu', () => {
      const sections = [section('public_transport', 'Hovercraft', 10000)]
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(
        ADEME_FACTORS['default'] * 10,
        5,
      )
    })

    it('additionne correctement un trajet multimodal (marche + metro + bus)', () => {
      const sections = [
        section('walking', undefined, 500),
        section('public_transport', 'Metro', 8000),
        section('public_transport', 'Bus', 3000),
      ]
      const expected = 0 * 0.5 + 0.004 * 8 + 0.113 * 3
      expect(service.calculateJourneyCo2(sections)).toBeCloseTo(expected, 5)
    })

    it('retourne 0 pour un tableau de sections vide', () => {
      expect(service.calculateJourneyCo2([])).toBe(0)
    })

    it('ignore la distance si geojson absent (length = 0)', () => {
      const sections = [{ type: 'public_transport', display_informations: { physical_mode: 'Bus' } }]
      expect(service.calculateJourneyCo2(sections)).toBe(0)
    })
  })

  describe('calculateCo2Saved', () => {
    it('retourne la difference positive par rapport a la voiture', () => {
      const distanceKm = 10
      const journeyCo2 = 0.04
      const carCo2 = ADEME_FACTORS['car'] * distanceKm
      expect(service.calculateCo2Saved(journeyCo2, distanceKm)).toBeCloseTo(carCo2 - journeyCo2, 5)
    })

    it('ne retourne jamais une valeur negative (trajet plus polluant que voiture)', () => {
      expect(service.calculateCo2Saved(999, 1)).toBe(0)
    })

    it('retourne 0 pour un trajet velo (CO2 equivalent voiture > 0, velo presque 0)', () => {
      const bikeCo2 = service.calculateJourneyCo2([section('bicycle', undefined, 5000)])
      const saved = service.calculateCo2Saved(bikeCo2, 5)
      expect(saved).toBeGreaterThan(0)
    })
  })

  describe('calculateCarEquivalent', () => {
    it('applique le facteur voiture ADEME (0.218 kg/km)', () => {
      expect(service.calculateCarEquivalent(10)).toBeCloseTo(2.18, 5)
    })
  })
})
