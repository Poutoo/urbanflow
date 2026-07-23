import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import type {
  AuthMeResponse,
  AuthResponse,
  AuthUser,
  AvatarId,
  JwtPayload,
  PriorityMode,
  TransportMode,
} from '@urbanflow/types';

export interface OAuthLoginResponse extends AuthResponse {
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'));
  }

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cette adresse email est déjà utilisée');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name ?? null,
        passwordHash,
        // La case CGU/confidentialité est obligatoire côté formulaire d'inscription
        // (frontend) avant l'appel à cet endpoint — cf. section 8.4 du dossier de
        // certification (preuve de consentement, principe d'accountability RGPD).
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            preferredModes: ['velo', 'bus', 'tram'],
            priorityMode: 'ecological',
          },
        },
      },
    });

    return this.generateTokenPair(user, userAgent, ipAddress);
  }

  async loginWithGoogle(
    idToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<OAuthLoginResponse> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    }).catch(() => {
      throw new UnauthorizedException('Jeton Google invalide');
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified || !payload.sub) {
      throw new UnauthorizedException('Jeton Google invalide');
    }

    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider: 'google', providerAccountId: payload.sub },
      },
      include: { user: true },
    });

    if (existingAccount) {
      const tokens = await this.generateTokenPair(existingAccount.user, userAgent, ipAddress);
      return { ...tokens, isNewUser: false };
    }

    const existingUserByEmail = await this.prisma.user.findUnique({ where: { email: payload.email } });

    if (existingUserByEmail) {
      await this.prisma.account.create({
        data: {
          userId: existingUserByEmail.id,
          provider: 'google',
          providerAccountId: payload.sub,
        },
      });
      const tokens = await this.generateTokenPair(existingUserByEmail, userAgent, ipAddress);
      return { ...tokens, isNewUser: false };
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
        // Pas de consentement CGU/confidentialité au moment de la création via Google
        // (contrairement au formulaire d'inscription) : recueilli juste après, sur
        // l'écran d'accueil dédié post-callback OAuth. Voir acceptTerms().
        termsAcceptedAt: null,
        accounts: {
          create: { provider: 'google', providerAccountId: payload.sub },
        },
        profile: {
          create: {
            preferredModes: ['velo', 'bus', 'tram'],
            priorityMode: 'ecological',
          },
        },
      },
    });

    const tokens = await this.generateTokenPair(newUser, userAgent, ipAddress);
    return { ...tokens, isNewUser: true };
  }

  async acceptTerms(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, termsAcceptedAt: null },
      data: { termsAcceptedAt: new Date() },
    });
  }

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      avatarId: user.avatarId as AvatarId | null,
    };
  }

  async login(user: AuthUser, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('Utilisateur introuvable');
    return this.generateTokenPair(dbUser, userAgent, ipAddress);
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.generateTokenPair(session.user, session.userAgent ?? undefined, session.ipAddress ?? undefined);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  async getMe(userId: string): Promise<AuthMeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      avatarId: user.avatarId as AvatarId | null,
      profile: {
        preferredModes: (user.profile?.preferredModes ?? []) as TransportMode[],
        priorityMode: (user.profile?.priorityMode ?? 'ecological') as PriorityMode,
        pmrEnabled: user.profile?.pmrEnabled ?? false,
        co2Goal: user.profile?.co2Goal ?? 40,
        totalCo2SavedKg: user.profile?.totalCo2SavedKg ?? 0,
        badgeLevel: user.profile?.badgeLevel ?? 0,
      },
    };
  }

  private async generateTokenPair(
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      avatarId?: string | null;
    },
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY') ?? '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        avatarId: (user.avatarId ?? null) as AvatarId | null,
      },
    };
  }
}
