import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { CacheKeys } from './cache.keys';
import { CACHE_TTL_SECONDS } from './cache.constants';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.warn(`Cache get failed for ${key}: ${error.message}`);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number = CACHE_TTL_SECONDS.default,
  ) {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache set failed for ${key}: ${error.message}`);
    }
  }

  async deleteByKeys(keys: string[]) {
    if (!keys.length) {
      return;
    }
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.warn(`Cache delete failed: ${error.message}`);
    }
  }

  async deleteByPattern(pattern: string) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Cache pattern delete failed for ${pattern}: ${error.message}`);
    }
  }

  async invalidateUser(userId: string) {
    await this.deleteByKeys([
      CacheKeys.authMe(userId),
      CacheKeys.adminUserDetails(userId),
      CacheKeys.applicationGarageDetails(userId),
      CacheKeys.applicationVehicleList(userId),
    ]);
    await this.deleteByPattern('cache:admin:users:list:*');
  }
}
