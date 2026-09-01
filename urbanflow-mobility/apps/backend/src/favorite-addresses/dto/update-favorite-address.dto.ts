import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFavoriteAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le libellé ne peut pas être vide' })
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "L'adresse ne peut pas être vide" })
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsLatitude({ message: 'Latitude invalide' })
  lat?: number;

  @IsOptional()
  @IsLongitude({ message: 'Longitude invalide' })
  lng?: number;
}
