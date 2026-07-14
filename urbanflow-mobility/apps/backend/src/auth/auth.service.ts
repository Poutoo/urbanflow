import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import type {
  AuthMeResponse,
  AuthResponse,
  AuthUser,
  JwtPayload,
  PriorityMode,
  TransportMode,
} from '@urbanflow/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cette adresse email est déjà utilisée');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name ?? null,
        passwordHash,
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

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;

    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
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
    user: { id: string; email: string; name: string | null; avatarUrl: string | null },
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
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  }
}
