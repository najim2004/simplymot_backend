export const CACHE_PREFIX = 'cache';

export const CACHE_TTL_SECONDS = {
  default: 300,
  authProfile: 300,
  userList: 180,
  userDetails: 180,
  garageSearch: 120,
  garageDetails: 180,
  vehicleList: 120,
} as const;
