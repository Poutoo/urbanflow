import { IsBoolean, IsEmail, IsString, MinLength, MaxLength, IsOptional, Equals } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsBoolean({ message: 'acceptTerms doit être un booléen' })
  @Equals(true, { message: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité" })
  acceptTerms!: boolean;
}
