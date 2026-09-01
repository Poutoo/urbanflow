import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteAddressDto } from './dto/create-favorite-address.dto';
import { UpdateFavoriteAddressDto } from './dto/update-favorite-address.dto';
import type { FavoriteAddress } from '@urbanflow/types';

@Injectable()
export class FavoriteAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FavoriteAddress[]> {
    const addresses = await this.prisma.favoriteAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return addresses.map((a) => this.mapAddress(a));
  }

  async create(userId: string, dto: CreateFavoriteAddressDto): Promise<FavoriteAddress> {
    const address = await this.prisma.favoriteAddress.create({
      data: { userId, ...dto },
    });
    return this.mapAddress(address);
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateFavoriteAddressDto,
  ): Promise<FavoriteAddress> {
    // updateMany scope la mise à jour à (id, userId) en une seule requête : un
    // utilisateur ne peut jamais modifier l'adresse d'un autre, même en
    // devinant un id valide — count === 0 couvre à la fois "id inexistant" et
    // "id existant mais appartenant à quelqu'un d'autre", sans les distinguer
    // (pas de fuite d'information sur l'existence de l'adresse d'autrui).
    const { count } = await this.prisma.favoriteAddress.updateMany({
      where: { id: addressId, userId },
      data: dto,
    });
    if (count === 0) throw new NotFoundException('Adresse favorite introuvable');

    const updated = await this.prisma.favoriteAddress.findUniqueOrThrow({
      where: { id: addressId },
    });
    return this.mapAddress(updated);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const { count } = await this.prisma.favoriteAddress.deleteMany({
      where: { id: addressId, userId },
    });
    if (count === 0) throw new NotFoundException('Adresse favorite introuvable');
  }

  private mapAddress(address: {
    id: string;
    userId: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
    createdAt: Date;
  }): FavoriteAddress {
    return {
      id: address.id,
      userId: address.userId,
      label: address.label,
      address: address.address,
      lat: address.lat,
      lng: address.lng,
      createdAt: address.createdAt.toISOString(),
    };
  }
}
