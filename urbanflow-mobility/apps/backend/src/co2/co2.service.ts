import { Injectable } from '@nestjs/common'

interface NavitiaSection {
  type: string
  display_informations?: {
    physical_mode?: string
  }
  geojson?: {
    length?: number
  }
}

export const ADEME_FACTORS: Record<string, number> = {
  walking: 0,
  bicycle: 0.005,
  bss_rent: 0.005,
  car: 0.218,
  ridesharing: 0.073,
  bus: 0.113,
  trolleybus: 0.025,
  metro: 0.004,
  tram: 0.004,
  train: 0.009,
  rapidtransit: 0.006,
  default: 0.05,
}

// Navitia retourne des physical_mode avec casse variable et noms non normalisés
const NAVITIA_MODE_MAP: Record<string, string> = {
  tramway: 'tram',
  'rapid transit': 'rapidtransit',
  rapidtransit: 'rapidtransit',
  localtrainfer: 'train',
  localtrain: 'train',
  longdistancetrain: 'train',
  coach: 'bus',
  ferry: 'default',
  funicular: 'default',
  cableway: 'default',
}

function normalizeMode(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, '')
  return NAVITIA_MODE_MAP[lower] ?? NAVITIA_MODE_MAP[raw.toLowerCase()] ?? lower
}

@Injectable()
export class Co2Service {
  calculateJourneyCo2(sections: NavitiaSection[]): number {
    return sections.reduce((total, section) => {
      const rawMode =
        section.type === 'public_transport'
          ? (section.display_informations?.physical_mode ?? 'default')
          : section.type
      const mode = normalizeMode(rawMode)
      const factor = ADEME_FACTORS[mode] ?? ADEME_FACTORS['default']
      const distanceKm = (section.geojson?.length ?? 0) / 1000
      return total + factor * distanceKm
    }, 0)
  }

  calculateCarEquivalent(distanceKm: number): number {
    return ADEME_FACTORS['car'] * distanceKm
  }

  calculateCo2Saved(journeyCo2: number, distanceKm: number): number {
    return Math.max(0, this.calculateCarEquivalent(distanceKm) - journeyCo2)
  }
}
