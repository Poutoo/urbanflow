import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

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
    updateMany: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
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

  // ─── loginWithGoogle ──────────────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    const validPayload = {
      sub: 'google-sub-1',
      email: 'nouveau@example.com',
      email_verified: true,
      name: 'Nouveau Compte',
      picture: 'https://example.com/avatar.png',
    };

    it('crée un nouvel utilisateur sans consentement CGU (isNewUser: true)', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => validPayload });
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...mockUser, id: 'user-google-1', termsAcceptedAt: null });
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await service.loginWithGoogle('valid-id-token');

      expect(result.isNewUser).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'nouveau@example.com', termsAcceptedAt: null }),
        }),
      );
    });

    it('reconnecte un compte Google déjà lié (isNewUser: false)', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => validPayload });
      mockPrisma.account.findUnique.mockResolvedValue({ userId: 'user-1', user: mockUser });
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await service.loginWithGoogle('valid-id-token');

      expect(result.isNewUser).toBe(false);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('lie le compte Google à un utilisateur existant par email (isNewUser: false)', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => validPayload });
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue(mockSession);

      const result = await service.loginWithGoogle('valid-id-token');

      expect(result.isNewUser).toBe(false);
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: mockUser.id, provider: 'google' }),
        }),
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('lève UnauthorizedException si le jeton Google est invalide', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('invalid signature'));

      await expect(service.loginWithGoogle('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it("lève UnauthorizedException si l'email Google n'est pas vérifié", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...validPayload, email_verified: false }),
      });

      await expect(service.loginWithGoogle('valid-id-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── acceptTerms ──────────────────────────────────────────────────────────

  describe('acceptTerms', () => {
    it("ne marque le consentement que s'il n'a pas déjà été donné", async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await service.acceptTerms('user-google-1');

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-google-1', termsAcceptedAt: null },
        data: { termsAcceptedAt: expect.any(Date) },
      });
    });
  });
});
