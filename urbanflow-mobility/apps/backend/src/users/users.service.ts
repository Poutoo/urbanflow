import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { UserProfile } from '@urbanflow/types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profil introuvable');

    return this.mapProfile(profile);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const { name, avatarId, homeCoordinates, workCoordinates, ...rest } = dto;

    // Prisma Json fields require plain object literals — class instances lack the index signature
    const prismaData = {
      ...rest,
      ...(homeCoordinates !== undefined && {
        homeCoordinates: { lat: homeCoordinates.lat, lng: homeCoordinates.lng },
      }),
      ...(workCoordinates !== undefined && {
        workCoordinates: { lat: workCoordinates.lat, lng: workCoordinates.lng },
      }),
    };

    // name/avatarId vivent sur User, pas UserProfile — mis à jour dans la même
    // transaction pour que l'écran profil reste un seul appel PUT atomique.
    const userData = {
      ...(name !== undefined && { name }),
      ...(avatarId !== undefined && { avatarId }),
    };

    const [profile] = await this.prisma.$transaction([
      this.prisma.userProfile.upsert({
        where: { userId },
        create: { userId, ...prismaData },
        update: prismaData,
      }),
      ...(Object.keys(userData).length > 0
        ? [this.prisma.user.update({ where: { id: userId }, data: userData })]
        : []),
    ]);

    return this.mapProfile(profile);
  }

  private mapProfile(profile: {
    id: string;
    userId: string;
    preferredModes: string[];
    priorityMode: string;
    pmrEnabled: boolean;
    noStairsEnabled: boolean;
    voiceGuidanceEnabled: boolean;
    themeMode: string;
    homeAddress: string | null;
    homeCoordinates: unknown;
    workAddress: string | null;
    workCoordinates: unknown;
    co2Goal: number;
  }): UserProfile {
    const toCoords = (raw: unknown) => {
      if (raw === null || raw === undefined) return null;
      const obj = raw as Record<string, unknown>;
      const lat = obj['lat'];
      const lng = obj['lng'];
      if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
      return null;
    };

    return {
      id: profile.id,
      userId: profile.userId,
      preferredModes: profile.preferredModes as UserProfile['preferredModes'],
      priorityMode: profile.priorityMode as UserProfile['priorityMode'],
      pmrEnabled: profile.pmrEnabled,
      noStairsEnabled: profile.noStairsEnabled,
      voiceGuidanceEnabled: profile.voiceGuidanceEnabled,
      themeMode: profile.themeMode as UserProfile['themeMode'],
      homeAddress: profile.homeAddress,
      homeCoordinates: toCoords(profile.homeCoordinates),
      workAddress: profile.workAddress,
      workCoordinates: toCoords(profile.workCoordinates),
      co2Goal: profile.co2Goal,
    };
  }
}
