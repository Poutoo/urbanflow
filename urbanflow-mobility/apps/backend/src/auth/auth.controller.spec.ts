import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

const mockAuthResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: '1', email: 'test@example.com', name: null, avatarUrl: null },
};

const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockAuthResponse),
  login: jest.fn().mockResolvedValue(mockAuthResponse),
  refreshToken: jest.fn().mockResolvedValue(mockAuthResponse),
  logout: jest.fn().mockResolvedValue(undefined),
  getMe: jest.fn().mockResolvedValue(mockAuthResponse.user),
};

describe('AuthController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{ user: typeof mockAuthResponse.user }>();
          req.user = mockAuthResponse.user;
          return true;
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{ user: { sub: string; email: string } }>();
          req.user = { sub: '1', email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('retourne 201 avec des tokens valides', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('retourne 400 si email invalide', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('retourne 400 si mot de passe trop court', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('retourne 200 avec des tokens valides', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });
  });

  describe('GET /auth/me', () => {
    it('retourne le profil avec un JWT valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email');
    });
  });
});
