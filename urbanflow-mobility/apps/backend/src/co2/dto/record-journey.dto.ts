import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator'

export const JOURNEY_STRATEGIES = ['fast', 'ecological', 'economic'] as const
export type JourneyStrategy = (typeof JOURNEY_STRATEGIES)[number]

export class RecordJourneyDto {
  // 0 autorisé : un trajet "Rapide" peut ne rien économiser vs voiture
  @IsNumber()
  @Min(0)
  co2SavedKg!: number

  @IsNumber()
  @Min(0)
  co2EmittedKg!: number

  @IsNumber()
  @IsPositive()
  distanceKm!: number

  @IsString()
  @IsNotEmpty()
  primaryMode!: string

  @IsIn(JOURNEY_STRATEGIES)
  strategy!: JourneyStrategy

  @IsInt()
  @Min(0)
  durationMin!: number
}
