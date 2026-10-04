import Redis from 'ioredis';
import { env } from './env.js';

// A resilient Redis wrapper. If Redis isn't reachable the app keeps working —
// caching becomes a no-op and Socket.IO falls back to its in-memory adapter.
let client = null;
let available = false;

function build(label) {
  const c = new Redis(env.redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    // Give up reconnecting after a few tries so we don't spam logs when Redis is absent.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000)),
  });
  c.on('ready', () => { if (label === 'main') { available = true; console.log('✔ Redis connected'); } });
  c.on('end', () => { if (label === 'main') available = false; });
  c.on('error', (e) => {
    if (label === 'main' && available) console.warn('Redis error:', e.message);
    if (label === 'main') available = false;
  });
  return c;
}

export const redis = {
  async connect() {
    if (!env.redisUrl) { console.log('· Redis disabled (REDIS_URL empty)'); return null; }
    if (client) return client;
    client = build('main');
    try {
      await client.connect();
      available = true;
    } catch (e) {
      available = false;
      console.warn(`⚠ Redis unavailable (${e.message}) — running without cache / socket adapter`);
    }
    return client;
  },

  client: () => client,
  isAvailable: () => available,

  // Two dedicated connections for the Socket.IO Redis adapter (pub / sub), or null.
  async pubSubPair() {
    if (!env.redisUrl) return null;
    try {
      const pub = build('pub');
      const sub = build('sub');
      await pub.connect();
      await sub.connect();
      return { pub, sub };
    } catch (e) {
      console.warn(`⚠ Redis adapter unavailable (${e.message})`);
      return null;
    }
  },

  // ---- tiny JSON cache helpers (safe no-ops when Redis is down) ----
  async cacheGet(key) {
    if (!available || !client) return null;
    try { const v = await client.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  async cacheSet(key, value, ttlSeconds = 60) {
    if (!available || !client) return;
    try { await client.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch { /* ignore */ }
  },
  async cacheDel(pattern) {
    if (!available || !client) return;
    try { await client.del(pattern); } catch { /* ignore */ }
  },

  async quit() {
    try { await client?.quit(); } catch { /* ignore */ }
  },
};
