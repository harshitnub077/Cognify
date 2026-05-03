// backend/src/services/cache.js — in-memory + Redis cache

import { createClient } from 'ioredis';

const TTL_SECONDS = 86_400; // 24 hours

// ── Redis client (optional) ──────────────────────────────────────────
let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = createClient(process.env.REDIS_URL);
    redis.on('error', err => console.warn('[Cache] Redis error:', err.message));
    await redis.ping();
    console.log('[Cache] Redis connected');
  } catch {
    console.warn('[Cache] Redis unavailable — using in-memory cache');
    redis = null;
  }
}

// ── In-memory fallback ───────────────────────────────────────────────
const memCache = new Map();

/**
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function getFromCache(key) {
  if (redis) {
    const raw = await redis.get(`fs:${key}`);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_SECONDS * 1000) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * @param {string} key
 * @param {object} value
 */
export async function setInCache(key, value) {
  if (redis) {
    await redis.setex(`fs:${key}`, TTL_SECONDS, JSON.stringify(value));
    return;
  }
  // Evict oldest entries if over 2000 items
  if (memCache.size > 2000) {
    const oldest = [...memCache.entries()]
      .sort(([, a], [, b]) => a.ts - b.ts)
      .slice(0, 200)
      .map(([k]) => k);
    oldest.forEach(k => memCache.delete(k));
  }
  memCache.set(key, { value, ts: Date.now() });
}

/**
 * @param {string} key
 */
export async function deleteFromCache(key) {
  if (redis) await redis.del(`fs:${key}`);
  memCache.delete(key);
}
