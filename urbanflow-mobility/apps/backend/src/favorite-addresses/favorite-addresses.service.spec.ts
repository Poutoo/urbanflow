import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  label: 'Domicile',
  address: '12 rue des Lilas, Paris',
  lat: 48.8698,
  lng: 2.3311,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockPrisma = {
  favoriteAddress: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

describe('FavoriteAddressesService', () => {
  let service: FavoriteAddressesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteAddressesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FavoriteAddressesService>(FavoriteAddressesService);
  });

  // ─── list ────────────────────────────────────────────────────────────────

  describe('list', () => {
    it("retourne uniquement les adresses de l'utilisateur demandé", async () => {
      mockPrisma.favoriteAddress.findMany.mockResolvedValue([mockAddress]);

      const result = await service.list('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.label).toBe('Domicile');
      expect(mockPrisma.favoriteAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('mappe createdAt en chaîne ISO', async () => {
      mockPrisma.favoriteAddress.findMany.mockResolvedValue([mockAddress]);

      const result = await service.list('user-1');

      expect(result[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it("crée l'adresse pour l'utilisateur authentifié (pas un id fourni par le client)", async () => {
      mockPrisma.favoriteAddress.create.mockResolvedValue(mockAddress);

      const dto = { label: 'Domicile', address: '12 rue des Lilas, Paris', lat: 48.8698, lng: 2.3311 };
      await service.create('user-1', dto);

      expect(mockPrisma.favoriteAddress.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...dto },
      });
    });
  });

  // ─── update — scoping strict par utilisateur ────────────────────────────

  describe('update', () => {
    it("met à jour l'adresse quand elle appartient bien à l'utilisateur", async () => {
      mockPrisma.favoriteAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.favoriteAddress.findUniqueOrThrow.mockResolvedValue({
        ...mockAddress,
        label: 'Nouveau nom',
      });

      const result = await service.update('user-1', 'addr-1', { label: 'Nouveau nom' });

      expect(mockPrisma.favoriteAddress.updateMany).toHaveBeenCalledWith({
        where: { id: 'addr-1', userId: 'user-1' },
        data: { label: 'Nouveau nom' },
      });
      expect(result.label).toBe('Nouveau nom');
    });

    it("lève NotFoundException si l'adresse appartient à un AUTRE utilisateur (scoping)", async () => {
      // updateMany scope la requête à (id, userId) : si l'adresse existe mais
      // appartient à quelqu'un d'autre, la clause where ne matche aucune ligne
      // → count 0, exactement comme un id inexistant. C'est le comportement
      // qui empêche un utilisateur de modifier l'adresse d'un autre.
      mockPrisma.favoriteAddress.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.update('attacker-user', 'addr-belonging-to-victim', { label: 'Piraté' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.favoriteAddress.updateMany).toHaveBeenCalledWith({
        where: { id: 'addr-belonging-to-victim', userId: 'attacker-user' },
        data: { label: 'Piraté' },
      });
      // La lecture qui suivrait une mise à jour réussie ne doit jamais avoir lieu
      expect(mockPrisma.favoriteAddress.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("lève NotFoundException si l'id n'existe pas du tout", async () => {
      mockPrisma.favoriteAddress.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.update('user-1', 'id-inexistant', { label: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove — scoping strict par utilisateur ────────────────────────────

  describe('remove', () => {
    it("supprime l'adresse quand elle appartient à l'utilisateur", async () => {
      mockPrisma.favoriteAddress.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('user-1', 'addr-1');

      expect(mockPrisma.favoriteAddress.deleteMany).toHaveBeenCalledWith({
        where: { id: 'addr-1', userId: 'user-1' },
      });
    });

    it("lève NotFoundException et ne supprime rien si l'adresse appartient à un AUTRE utilisateur", async () => {
      mockPrisma.favoriteAddress.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('attacker-user', 'addr-belonging-to-victim')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.favoriteAddress.deleteMany).toHaveBeenCalledWith({
        where: { id: 'addr-belonging-to-victim', userId: 'attacker-user' },
      });
    });
  });
});
