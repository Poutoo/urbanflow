import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  preferredModes: ['velo', 'bus'],
  priorityMode: 'ecological',
  pmrEnabled: false,
  noStairsEnabled: false,
  voiceGuidanceEnabled: false,
  themeMode: 'system',
  homeAddress: '1 rue de la Paix, Paris',
  homeCoordinates: { lat: 48.8698, lng: 2.3311 },
  workAddress: null,
  workCoordinates: null,
  co2Goal: 40.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  passwordHash: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  userProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('retourne le profil mappé quand il existe', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.preferredModes).toEqual(['velo', 'bus']);
      expect(result.priorityMode).toBe('ecological');
      expect(result.homeCoordinates).toEqual({ lat: 48.8698, lng: 2.3311 });
      expect(result.workCoordinates).toBeNull();
      expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('lève NotFoundException si le profil est introuvable', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('unknown-user')).rejects.toThrow(NotFoundException);
      await expect(service.getProfile('unknown-user')).rejects.toThrow('Profil introuvable');
    });

    it('mappe les coordonnées null en null', async () => {
      const profileWithNullCoords = {
        ...mockProfile,
        homeCoordinates: null,
        workCoordinates: null,
      };
      mockPrisma.userProfile.findUnique.mockResolvedValue(profileWithNullCoords);

      const result = await service.getProfile('user-1');

      expect(result.homeCoordinates).toBeNull();
      expect(result.workCoordinates).toBeNull();
    });

    it('retourne null pour des coordonnées avec type non-number', async () => {
      const profileWithBadCoords = {
        ...mockProfile,
        homeCoordinates: { lat: 'not-a-number', lng: 2.33 },
      };
      mockPrisma.userProfile.findUnique.mockResolvedValue(profileWithBadCoords);

      const result = await service.getProfile('user-1');

      expect(result.homeCoordinates).toBeNull();
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('met à jour le profil sans changer le nom', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile]);

      const dto = { preferredModes: ['velo', 'metro'], pmrEnabled: true };
      const result = await service.updateProfile('user-1', dto);

      expect(result.preferredModes).toEqual(['velo', 'bus']); // valeur du mock retourné
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Vérifie que user.update n'est pas dans la transaction (pas de name dans dto)
      const transactionArgs: unknown[] = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      expect(transactionArgs).toHaveLength(1);
    });

    it('inclut user.update dans la transaction quand name est fourni', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile, mockUser]);

      const dto = { name: 'Nouveau Nom', preferredModes: ['bus'] };
      await service.updateProfile('user-1', dto);

      const transactionArgs: unknown[] = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      expect(transactionArgs).toHaveLength(2);
    });

    it('inclut user.update dans la transaction quand avatarId est fourni', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile, mockUser]);

      await service.updateProfile('user-1', { avatarId: 'avatar-03' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarId: 'avatar-03' },
      });
      const transactionArgs: unknown[] = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      expect(transactionArgs).toHaveLength(2);
    });

    it('convertit les homeCoordinates en objet plain pour Prisma', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile]);
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);

      const dto = { homeCoordinates: { lat: 48.85, lng: 2.35 } };
      await service.updateProfile('user-1', dto);

      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            homeCoordinates: { lat: 48.85, lng: 2.35 },
          }),
        }),
      );
    });

    it('convertit les workCoordinates en objet plain pour Prisma', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile]);
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);

      const dto = { workCoordinates: { lat: 48.87, lng: 2.37 } };
      await service.updateProfile('user-1', dto);

      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            workCoordinates: { lat: 48.87, lng: 2.37 },
          }),
        }),
      );
    });

    it("n'inclut pas homeCoordinates dans prismaData si absent du dto", async () => {
      mockPrisma.$transaction.mockResolvedValue([mockProfile]);
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);

      const dto = { pmrEnabled: true };
      await service.updateProfile('user-1', dto);

      const upsertCall = mockPrisma.userProfile.upsert.mock.calls[0][0] as {
        update: Record<string, unknown>;
      };
      expect(upsertCall.update).not.toHaveProperty('homeCoordinates');
      expect(upsertCall.update).not.toHaveProperty('workCoordinates');
    });

    it('retourne le profil mappé après mise à jour', async () => {
      const updatedProfile = { ...mockProfile, pmrEnabled: true };
      mockPrisma.$transaction.mockResolvedValue([updatedProfile]);

      const result = await service.updateProfile('user-1', { pmrEnabled: true });

      expect(result.pmrEnabled).toBe(true);
    });
  });
});
