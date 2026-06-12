import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(private config: ConfigService) {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!)
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key)
    return data ? (JSON.parse(data) as T) : null
  }

  async set(key: string, value: unknown, ttlSeconds = 120): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  onModuleDestroy() {
    this.client.disconnect()
  }
}
