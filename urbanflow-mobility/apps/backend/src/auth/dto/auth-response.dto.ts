export class AuthUserDto {
  id!: string;
  email!: string;
  name!: string | null;
  avatarUrl!: string | null;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: AuthUserDto;
}
