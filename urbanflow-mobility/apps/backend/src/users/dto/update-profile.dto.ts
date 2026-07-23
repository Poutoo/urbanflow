import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

const VALID_MODES = ['velo', 'bus', 'tram', 'metro', 'marche', 'trottinette', 'covoiturage'] as const;
const VALID_PRIORITIES = ['fast', 'ecological', 'economic'] as const;
const VALID_THEME_MODES = ['light', 'dark', 'system'] as const;
type ThemeMode = (typeof VALID_THEME_MODES)[number];

export class UpdateProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_MODES, { each: true })
  preferredModes?: string[];

  @IsOptional()
  @IsString()
  @IsIn(VALID_PRIORITIES)
  priorityMode?: string;

  @IsOptional()
  @IsBoolean()
  pmrEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  noStairsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  voiceGuidanceEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(VALID_THEME_MODES)
  themeMode?: ThemeMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  homeAddress?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  homeCoordinates?: CoordinatesDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  workAddress?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  workCoordinates?: CoordinatesDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  co2Goal?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
