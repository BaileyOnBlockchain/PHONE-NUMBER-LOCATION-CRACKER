import NodeCache from 'node-cache';
import { createHash } from 'crypto';

const ttl = parseInt(process.env.CACHE_TTL || '3600');
const cache = new NodeCache({ stdTTL: ttl, checkperiod: 120 });

export function cacheKey(number) {
  return createHash('sha256').update(number.trim()).digest('hex').slice(0, 16);
}

export function getCached(number) {
  return cache.get(cacheKey(number));
}

export function setCached(number, data) {
  cache.set(cacheKey(number), data);
}

export function cacheStats() {
  return cache.getStats();
}
