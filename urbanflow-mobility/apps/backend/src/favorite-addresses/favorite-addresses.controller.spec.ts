import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { FavoriteAddressesController } from './favorite-addresses.controller';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  label: 'Domicile',
  address: '12 rue des Lilas, Paris',
  lat: 48.8698,
  lng: 2.3311,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

// Simule le JWT de l'utilisateur "user-1" — c'est ce sub, jamais un id fourni
// par le corps de la requête, qui doit être transmis au service.
const jwtGuardMock = {
  canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: { sub: string; email: string } }>();
    req.user = { sub: 'user-1', email: 'test@example.com' };
    return true;
  },
};

describe('FavoriteAddressesController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteAddressesController],
      providers: [{ provide: FavoriteAddressesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuardMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GET /favorite-addresses ─────────────────────────────────────────────

  describe('GET /favorite-addresses', () => {
    it("retourne 200 avec la liste, scopée au sub du JWT (jamais un id de body/query)", async () => {
      mockService.list.mockResolvedValue([mockAddress]);

      const res = await request(app.getHttpServer())
        .get('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(mockService.list).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── POST /favorite-addresses ────────────────────────────────────────────

  describe('POST /favorite-addresses', () => {
    it('retourne 201 et crée avec des coordonnées et un libellé valides', async () => {
      mockService.create.mockResolvedValue(mockAddress);

      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas, Paris', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(201);
      expect(mockService.create).toHaveBeenCalledWith('user-1', {
        label: 'Domicile',
        address: '12 rue des Lilas, Paris',
        lat: 48.8698,
        lng: 2.3311,
      });
    });

    it('retourne 400 si le libellé est vide', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: '', address: '12 rue des Lilas, Paris', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(400);
    });

    it("retourne 400 si l'adresse est vide", async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si la latitude est hors bornes (> 90)', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas, Paris', lat: 91, lng: 2.3311 });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si la longitude est hors bornes (> 180)', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas, Paris', lat: 48.8698, lng: 181 });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si lat/lng sont des chaînes non numériques', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas, Paris', lat: 'nord', lng: 'est' });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si le libellé dépasse 50 caractères', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'x'.repeat(51), address: '12 rue des Lilas, Paris', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /favorite-addresses/:id ───────────────────────────────────────

  describe('PATCH /favorite-addresses/:id', () => {
    it('retourne 200 et transmet le sub du JWT + le body au service', async () => {
      mockService.update.mockResolvedValue({ ...mockAddress, label: 'Nouveau nom' });

      const res = await request(app.getHttpServer())
        .patch('/favorite-addresses/addr-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Nouveau nom' });

      expect(res.status).toBe(200);
      expect(mockService.update).toHaveBeenCalledWith('user-1', 'addr-1', { label: 'Nouveau nom' });
    });

    it("retourne 404 si l'adresse n'appartient pas à l'utilisateur connecté", async () => {
      mockService.update.mockRejectedValue(new NotFoundException('Adresse favorite introuvable'));

      const res = await request(app.getHttpServer())
        .patch('/favorite-addresses/addr-appartenant-a-un-autre')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Tentative de piratage' });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /favorite-addresses/:id ──────────────────────────────────────

  describe('DELETE /favorite-addresses/:id', () => {
    it('retourne 204 et transmet le sub du JWT au service (jamais un userId de body)', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete('/favorite-addresses/addr-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(204);
      expect(mockService.remove).toHaveBeenCalledWith('user-1', 'addr-1');
    });

    it("retourne 404 quand un utilisateur tente de supprimer l'adresse d'un AUTRE utilisateur", async () => {
      // Le contrôleur ne fait confiance qu'au sub du JWT (toujours "user-1" ici,
      // via jwtGuardMock) — jamais à un identifiant utilisateur transmis par le
      // client. Ce test vérifie que le 404 renvoyé par le service (scoping en
      // base, voir favorite-addresses.service.spec.ts) traverse bien jusqu'à
      // la réponse HTTP, sans jamais renvoyer 200/204 par erreur.
      mockService.remove.mockRejectedValue(new NotFoundException('Adresse favorite introuvable'));

      const res = await request(app.getHttpServer())
        .delete('/favorite-addresses/addr-appartenant-a-un-autre-utilisateur')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(mockService.remove).toHaveBeenCalledWith('user-1', 'addr-appartenant-a-un-autre-utilisateur');
    });
  });
});
