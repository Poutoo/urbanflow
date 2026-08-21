import { IsString, IsNotEmpty } from 'class-validator';

export class OAuthLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
