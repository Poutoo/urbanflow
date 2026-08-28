import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min, Max } from 'class-validator'

export const JOURNEY_STRATEGIES = ['fast', 'ecological', 'economic'] as const
export type JourneyStrategy = (typeof JOURNEY_STRATEGIES)[number]

// Bornes défensives : aucun trajet urbain multimodal réel ne dépasse ces ordres
// de grandeur. Objectif = limiter l'ampleur d'une falsification de score côté
// client, pas remplacer un recalcul serveur (cf. audit sécurité, MED-01).
const MAX_JOURNEY_CO2_KG = 200
const MAX_JOURNEY_DISTANCE_KM = 500
const MAX_JOURNEY_DURATION_MIN = 24 * 60

export class RecordJourneyDto {
  // 0 autorisé : un trajet "Rapide" peut ne rien économiser vs voiture
  @IsNumber()
  @Min(0)
  @Max(MAX_JOURNEY_CO2_KG)
  co2SavedKg!: number

  @IsNumber()
  @Min(0)
  @Max(MAX_JOURNEY_CO2_KG)
  co2EmittedKg!: number

  @IsNumber()
  @IsPositive()
  @Max(MAX_JOURNEY_DISTANCE_KM)
  distanceKm!: number

  @IsString()
  @IsNotEmpty()
  primaryMode!: string

  @IsIn(JOURNEY_STRATEGIES)
  strategy!: JourneyStrategy

  @IsInt()
  @Min(0)
  @Max(MAX_JOURNEY_DURATION_MIN)
  durationMin!: number
}
