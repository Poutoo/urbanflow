import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteAddressDto, UpdateFavoriteAddressDto } from './dto/favorite-address.dto';
import type { FavoriteAddress } from '@urbanflow/types';

@Injectable()
export class FavoriteAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FavoriteAddress[]> {
    const addresses = await this.prisma.favoriteAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return addresses.map(this.serialize);
  }

  async create(userId: string, dto: CreateFavoriteAddressDto): Promise<FavoriteAddress> {
    const address = await this.prisma.favoriteAddress.create({
      data: { userId, ...dto },
    });
    return this.serialize(address);
  }

  async update(userId: string, id: string, dto: UpdateFavoriteAddressDto): Promise<FavoriteAddress> {
    await this.findOwned(userId, id);
    const address = await this.prisma.favoriteAddress.update({
      where: { id },
      data: dto,
    });
    return this.serialize(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.favoriteAddress.delete({ where: { id } });
  }

  /**
   * Scoping strict : une adresse n'est trouvée que si elle appartient à
   * l'utilisateur courant — un id valide d'un autre utilisateur renvoie 404,
   * pas 403, pour ne pas révéler son existence.
   */
  private async findOwned(userId: string, id: string) {
    const address = await this.prisma.favoriteAddress.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Adresse favorite introuvable');
    return address;
  }

  private serialize(address: {
    id: string;
    userId: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
    createdAt: Date;
  }): FavoriteAddress {
    return { ...address, createdAt: address.createdAt.toISOString() };
  }
}
