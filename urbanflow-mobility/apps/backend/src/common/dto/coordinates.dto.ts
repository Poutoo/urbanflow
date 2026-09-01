import { IsLatitude, IsLongitude } from 'class-validator';

/**
 * Coordonnées GPS validées (bornes lat/lng réelles, pas seulement des
 * nombres quelconques) — partagé entre UpdateProfileDto et les DTO
 * d'adresses favorites.
 */
export class CoordinatesDto {
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}
