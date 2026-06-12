import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CacheService } from './cache.service'

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  disconnect: jest.fn(),
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedis),
}))

describe('CacheService', () => {
  let service: CacheService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: { get: () => 'redis://localhost:6379' },
        },
      ],
    }).compile()

    service = module.get(CacheService)
  })

  describe('get', () => {
    it('retourne null quand la clé est absente', async () => {
      mockRedis.get.mockResolvedValue(null)
      expect(await service.get('missing')).toBeNull()
    })

    it('retourne la valeur désérialisée quand la clé existe', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ duration: 600 }))
      expect(await service.get('key')).toEqual({ duration: 600 })
    })
  })

  describe('set', () => {
    it('appelle setex avec le TTL par défaut (120s)', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      await service.set('key', { duration: 600 })
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 120, JSON.stringify({ duration: 600 }))
    })

    it('appelle setex avec un TTL personnalisé', async () => {
      mockRedis.setex.mockResolvedValue('OK')
      await service.set('key', { foo: 'bar' }, 30)
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 30, JSON.stringify({ foo: 'bar' }))
    })
  })

  describe('del', () => {
    it('appelle del avec la bonne clé', async () => {
      mockRedis.del.mockResolvedValue(1)
      await service.del('key')
      expect(mockRedis.del).toHaveBeenCalledWith('key')
    })
  })

  describe('onModuleDestroy', () => {
    it('déconnecte le client Redis', () => {
      service.onModuleDestroy()
      expect(mockRedis.disconnect).toHaveBeenCalled()
    })
  })
})
