export class RouteResultDto {
  id!: string
  duration!: number
  departureTime!: string
  arrivalTime!: string
  co2Kg!: number
  co2SavedKg!: number
  isPmrAccessible!: boolean
  sections!: RouteSectionDto[]
}

export class RouteSectionDto {
  type!: string
  mode!: string
  line?: string
  duration!: number
  from?: string
  to?: string
  coordinates!: number[][]
}
