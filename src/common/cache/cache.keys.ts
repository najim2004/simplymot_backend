import { CACHE_PREFIX } from './cache.constants';

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export class CacheKeys {
  static authMe(userId: string) {
    return `${CACHE_PREFIX}:auth:me:${userId}`;
  }

  static adminUserList(querySignature: string) {
    return `${CACHE_PREFIX}:admin:users:list:${querySignature}`;
  }

  static adminUserDetails(userId: string) {
    return `${CACHE_PREFIX}:admin:users:details:${userId}`;
  }

  static applicationGarageSearch(querySignature: string) {
    return `${CACHE_PREFIX}:application:garage:search:${querySignature}`;
  }

  static applicationGarageDetails(userId: string) {
    return `${CACHE_PREFIX}:application:garage:details:${userId}`;
  }

  static applicationVehicleList(userId: string) {
    return `${CACHE_PREFIX}:application:vehicle:list:${userId}`;
  }

  static fromObject(input: Record<string, unknown>) {
    return Object.entries(input)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${normalize(value)}`)
      .join('|');
  }
}
