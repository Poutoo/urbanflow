import { IsLatitude, IsLongitude, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFavoriteAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Le libellé ne peut pas être vide' })
  @MaxLength(50)
  label!: string;

  @IsString()
  @IsNotEmpty({ message: "L'adresse ne peut pas être vide" })
  @MaxLength(255)
  address!: string;

  @IsLatitude({ message: 'Latitude invalide' })
  lat!: number;

  @IsLongitude({ message: 'Longitude invalide' })
  lng!: number;
}
