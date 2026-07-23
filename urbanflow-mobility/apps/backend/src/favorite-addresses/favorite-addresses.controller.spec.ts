import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { FavoriteAddressesController } from './favorite-addresses.controller';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockAddress = {
  id: 'address-1',
  userId: 'user-1',
  label: 'Domicile',
  address: '12 rue des Lilas, Centre',
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /favorite-addresses', () => {
    it("retourne la liste des adresses de l'utilisateur connecté", async () => {
      mockService.list.mockResolvedValue([mockAddress]);

      const res = await request(app.getHttpServer())
        .get('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([mockAddress]);
      expect(mockService.list).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /favorite-addresses', () => {
    it('crée une adresse avec des coordonnées valides', async () => {
      mockService.create.mockResolvedValue(mockAddress);

      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas, Centre', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(201);
      expect(mockService.create).toHaveBeenCalledWith('user-1', {
        label: 'Domicile',
        address: '12 rue des Lilas, Centre',
        lat: 48.8698,
        lng: 2.3311,
      });
    });

    it('retourne 400 si le libellé est vide', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: '', address: '12 rue des Lilas', lat: 48.8698, lng: 2.3311 });

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('retourne 400 si la latitude est hors bornes', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas', lat: 200, lng: 2.3311 });

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('retourne 400 si la longitude est hors bornes', async () => {
      const res = await request(app.getHttpServer())
        .post('/favorite-addresses')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Domicile', address: '12 rue des Lilas', lat: 48.8698, lng: -200 });

      expect(res.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /favorite-addresses/:id', () => {
    it("supprime une adresse appartenant à l'utilisateur connecté", async () => {
      mockService.remove.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete('/favorite-addresses/address-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(mockService.remove).toHaveBeenCalledWith('user-1', 'address-1');
    });

    it("retourne 404 quand l'adresse appartient à un autre utilisateur (scoping)", async () => {
      // Le guard JWT mocké injecte toujours user-1 ; le service (qui scope
      // réellement en base) simule ici le cas où address-1 appartient à un
      // autre utilisateur — le contrôleur doit propager le 404, pas exposer
      // ni supprimer la ressource d'autrui.
      mockService.remove.mockRejectedValue(new NotFoundException('Adresse favorite introuvable'));

      const res = await request(app.getHttpServer())
        .delete('/favorite-addresses/address-of-another-user')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(mockService.remove).toHaveBeenCalledWith('user-1', 'address-of-another-user');
    });
  });

  describe('PATCH /favorite-addresses/:id', () => {
    it("retourne 404 quand l'adresse appartient à un autre utilisateur (scoping)", async () => {
      mockService.update.mockRejectedValue(new NotFoundException('Adresse favorite introuvable'));

      const res = await request(app.getHttpServer())
        .patch('/favorite-addresses/address-of-another-user')
        .set('Authorization', 'Bearer valid-token')
        .send({ label: 'Piraté' });

      expect(res.status).toBe(404);
    });
  });
});
