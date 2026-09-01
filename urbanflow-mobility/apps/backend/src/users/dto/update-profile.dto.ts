import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

const VALID_MODES = ['velo', 'bus', 'tram', 'metro', 'marche', 'trottinette', 'covoiturage'] as const;
const VALID_PRIORITIES = ['fast', 'ecological', 'economic'] as const;

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
  @IsBoolean()
  darkModeEnabled?: boolean;

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
