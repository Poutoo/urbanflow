import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  preferredModes: ['velo', 'bus'],
  priorityMode: 'ecological',
  pmrEnabled: false,
  noStairsEnabled: false,
  voiceGuidanceEnabled: false,
  darkModeEnabled: false,
  avatarId: null,
  co2Goal: 40.0,
};

const mockUsersService = {
  getProfile: jest.fn().mockResolvedValue(mockProfile),
  updateProfile: jest.fn().mockResolvedValue(mockProfile),
};

const jwtGuardMock = {
  canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: { sub: string; email: string } }>();
    req.user = { sub: 'user-1', email: 'test@example.com' };
    return true;
  },
};

describe('UsersController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuardMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersService.getProfile.mockResolvedValue(mockProfile);
    mockUsersService.updateProfile.mockResolvedValue(mockProfile);
  });

  // ─── GET /users/profile ──────────────────────────────────────────────────

  describe('GET /users/profile', () => {
    it('retourne 200 avec le profil de l\'utilisateur connecté', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('userId', 'user-1');
      expect(res.body).toHaveProperty('preferredModes');
    });

    it('appelle UsersService.getProfile avec le sub du JWT', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-1');
      expect(mockUsersService.getProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ─── PUT /users/profile ──────────────────────────────────────────────────

  describe('PUT /users/profile', () => {
    it('retourne 200 avec le profil mis à jour', async () => {
      const updatedProfile = { ...mockProfile, pmrEnabled: true };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ pmrEnabled: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pmrEnabled', true);
    });

    it('appelle UsersService.updateProfile avec le sub et le body', async () => {
      const dto = { preferredModes: ['velo', 'metro'], priorityMode: 'fast' };

      await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(dto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-1', expect.objectContaining(dto));
    });

    it('retourne 400 si preferredModes contient un mode invalide', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ preferredModes: ['avion'] });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si priorityMode est invalide', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ priorityMode: 'unknown-mode' });

      expect(res.status).toBe(400);
    });

    it('accepte un body vide (tous les champs sont optionnels)', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
    });

    it('accepte la mise à jour du nom', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Nouveau Nom' });

      expect(res.status).toBe(200);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Nouveau Nom' }),
      );
    });

    it('retourne 400 si co2Goal dépasse le maximum autorisé', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ co2Goal: 10001 });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si co2Goal est négatif', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ co2Goal: -1 });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si voiceGuidanceEnabled n\'est pas un booléen', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ voiceGuidanceEnabled: 'oui' });

      expect(res.status).toBe(400);
    });

    it("retourne 400 si avatarId ne fait pas partie de la liste autorisée", async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ avatarId: '../../etc/passwd' });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si avatarId est une URL arbitraire', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ avatarId: 'https://evil.example.com/tracker.png' });

      expect(res.status).toBe(400);
    });

    it('accepte un avatarId valide de la liste autorisée', async () => {
      const updatedProfile = { ...mockProfile, avatarId: 'avatar-03' };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ avatarId: 'avatar-03' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('avatarId', 'avatar-03');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatarId: 'avatar-03' }),
      );
    });

    it('accepte voiceGuidanceEnabled à true', async () => {
      const updatedProfile = { ...mockProfile, voiceGuidanceEnabled: true };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ voiceGuidanceEnabled: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('voiceGuidanceEnabled', true);
    });
  });
});
