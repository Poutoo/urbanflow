export interface GbfsStation {
  id: string
  name: string
  lat: number
  lng: number
  bikesAvailable: number
  docksAvailable: number
}

export interface RecommendedBikeStation {
  station: GbfsStation
  distanceM: number
}

export interface SearchRoutesResult {
  fast: RouteResult | null
  ecological: RouteResult | null
  economic: RouteResult | null
  nearbyBikeStations: GbfsStation[]
}

export interface RouteResult {
  id: string
  duration: number
  departureTime: string
  arrivalTime: string
  distanceKm: number
  co2Kg: number
  co2SavedKg: number
  isPmrAccessible: boolean
  sections: RouteSection[]
  // Station Vélib' vers laquelle diriger l'utilisateur (trajet écologique uniquement)
  recommendedBikeStation?: RecommendedBikeStation
}

export interface RouteSection {
  type: string
  mode: string
  line?: string
  duration: number
  from?: string
  to?: string
  coordinates: number[][]
  estimated?: boolean // true = ligne droite de fallback, pas de géométrie réelle
}
