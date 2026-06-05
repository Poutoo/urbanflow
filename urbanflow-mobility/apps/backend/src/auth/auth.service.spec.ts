import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  passwordHash: null as string | null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  refreshToken: 'valid-refresh-token',
  userAgent: null,
  ipAddress: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  user: mockUser,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('15m'),
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('crée un utilisateur et retourne des tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await service.register({ email: 'test@example.com', password: 'password123' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it("lève ConflictException si l'email existe déjà", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('hash le mot de passe avec argon2 (pas bcrypt)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const hashSpy = jest.spyOn(argon2, 'hash');
      await service.register({ email: 'new@example.com', password: 'password123' });

      expect(hashSpy).toHaveBeenCalledWith('password123');
    });
  });

  // ─── validateUser ─────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('retourne null si le mot de passe est incorrect', async () => {
      const hash = await argon2.hash('correct-password');
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.validateUser('test@example.com', 'wrong-password');
      expect(result).toBeNull();
    });

    it('retourne le user si les credentials sont valides', async () => {
      const hash = await argon2.hash('correct-password');
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.validateUser('test@example.com', 'correct-password');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('retourne null si le user est introuvable', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('nobody@example.com', 'password');
      expect(result).toBeNull();
    });
  });

  // ─── refreshToken ─────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('échange un refresh token valide contre de nouveaux tokens', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.delete.mockResolvedValue(mockSession);
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await service.refreshToken('valid-refresh-token');
      expect(result.accessToken).toBe('signed-token');
    });

    it('lève UnauthorizedException pour un token invalide', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException pour un token expiré', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.session.findUnique.mockResolvedValue(expiredSession);
      mockPrisma.session.delete.mockResolvedValue(expiredSession);

      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
