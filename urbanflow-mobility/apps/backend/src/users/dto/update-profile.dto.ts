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
// Liste fermée des avatars prédéfinis — doit rester alignée sur AVATAR_IDS
// de @urbanflow/types (consommé tel quel côté frontend). Redéclarée ici en
// valeur locale : ce package ne publie que des types (`main` → index.ts),
// l'importer comme valeur casse `node dist/main.js` en production.
const VALID_AVATAR_IDS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const;

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

  // Jamais une URL arbitraire fournie par le client : uniquement une clé
  // parmi la liste fermée VALID_AVATAR_IDS — toute autre valeur est rejetée (400).
  @IsOptional()
  @IsIn(VALID_AVATAR_IDS)
  avatarId?: string;

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
