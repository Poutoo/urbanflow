import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFavoriteAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}

export class UpdateFavoriteAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
