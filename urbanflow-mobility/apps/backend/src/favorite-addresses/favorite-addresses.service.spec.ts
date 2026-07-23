import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAddress = {
  id: 'address-1',
  userId: 'user-1',
  label: 'Domicile',
  address: '12 rue des Lilas, Centre',
  lat: 48.8698,
  lng: 2.3311,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockPrisma = {
  favoriteAddress: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('FavoriteAddressesService', () => {
  let service: FavoriteAddressesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FavoriteAddressesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<FavoriteAddressesService>(FavoriteAddressesService);
  });

  describe('list', () => {
    it("retourne les adresses de l'utilisateur, sérialisées", async () => {
      mockPrisma.favoriteAddress.findMany.mockResolvedValue([mockAddress]);

      const result = await service.list('user-1');

      expect(result).toEqual([{ ...mockAddress, createdAt: '2026-01-01T00:00:00.000Z' }]);
      expect(mockPrisma.favoriteAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('create', () => {
    it("crée l'adresse pour l'utilisateur courant", async () => {
      mockPrisma.favoriteAddress.create.mockResolvedValue(mockAddress);

      const dto = { label: 'Domicile', address: '12 rue des Lilas, Centre', lat: 48.8698, lng: 2.3311 };
      const result = await service.create('user-1', dto);

      expect(mockPrisma.favoriteAddress.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...dto },
      });
      expect(result.label).toBe('Domicile');
    });
  });

  describe('update', () => {
    it("met à jour l'adresse quand elle appartient à l'utilisateur", async () => {
      mockPrisma.favoriteAddress.findFirst.mockResolvedValue(mockAddress);
      mockPrisma.favoriteAddress.update.mockResolvedValue({ ...mockAddress, label: 'Nouveau nom' });

      const result = await service.update('user-1', 'address-1', { label: 'Nouveau nom' });

      expect(mockPrisma.favoriteAddress.findFirst).toHaveBeenCalledWith({
        where: { id: 'address-1', userId: 'user-1' },
      });
      expect(result.label).toBe('Nouveau nom');
    });

    it("lève NotFoundException si l'adresse appartient à un autre utilisateur", async () => {
      mockPrisma.favoriteAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-2', 'address-1', { label: 'Piraté' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.favoriteAddress.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it("supprime l'adresse quand elle appartient à l'utilisateur", async () => {
      mockPrisma.favoriteAddress.findFirst.mockResolvedValue(mockAddress);

      await service.remove('user-1', 'address-1');

      expect(mockPrisma.favoriteAddress.delete).toHaveBeenCalledWith({ where: { id: 'address-1' } });
    });

    it("lève NotFoundException et ne supprime rien pour un autre utilisateur (scoping)", async () => {
      mockPrisma.favoriteAddress.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-2', 'address-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.favoriteAddress.delete).not.toHaveBeenCalled();
    });
  });
});
