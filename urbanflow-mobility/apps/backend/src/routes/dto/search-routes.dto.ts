import { IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class SearchRoutesDto {
  @IsNumber()
  @Type(() => Number)
  fromLat!: number

  @IsNumber()
  @Type(() => Number)
  fromLng!: number

  @IsNumber()
  @Type(() => Number)
  toLat!: number

  @IsNumber()
  @Type(() => Number)
  toLng!: number

  @IsDateString()
  @IsOptional()
  departureTime?: string

  @IsBoolean()
  @IsOptional()
  pmrOnly?: boolean
}
