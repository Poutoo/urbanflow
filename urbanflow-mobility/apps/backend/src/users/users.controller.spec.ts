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
  themeMode: 'system',
  homeAddress: null,
  homeCoordinates: null,
  workAddress: null,
  workCoordinates: null,
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

    it('retourne 400 si themeMode est invalide', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ themeMode: 'blue' });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si voiceGuidanceEnabled n\'est pas un booléen', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ voiceGuidanceEnabled: 'oui' });

      expect(res.status).toBe(400);
    });

    it('accepte themeMode et voiceGuidanceEnabled valides', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ themeMode: 'dark', voiceGuidanceEnabled: true });

      expect(res.status).toBe(200);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ themeMode: 'dark', voiceGuidanceEnabled: true }),
      );
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

    it('accepte homeCoordinates avec lat/lng valides', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ homeCoordinates: { lat: 48.85, lng: 2.35 } });

      expect(res.status).toBe(200);
    });

    it('retourne 400 si le nom est une chaîne vide', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(mockUsersService.updateProfile).not.toHaveBeenCalled();
    });

    it("retourne 400 si avatarId n'appartient pas à la liste autorisée", async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ avatarId: 'avatar-custom-injected.png' });

      expect(res.status).toBe(400);
      expect(mockUsersService.updateProfile).not.toHaveBeenCalled();
    });

    it('accepte un avatarId valide parmi la liste autorisée', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ avatarId: 'avatar-03' });

      expect(res.status).toBe(200);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ avatarId: 'avatar-03' }),
      );
    });
  });
});
