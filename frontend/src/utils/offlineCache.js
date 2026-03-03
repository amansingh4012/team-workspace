/**
 * Offline caching layer using idb-keyval (IndexedDB).
 *
 * • GET responses are transparently cached after every successful fetch.
 * • When the network is unavailable the axios interceptor in api/axios.js
 *   serves stale data from the cache so the user can still browse.
 * • Mutation requests (POST / PUT / DELETE) that fail due to a network error
 *   are pushed onto a queue that is replayed once the browser goes back online.
 */
import { get, set, del, keys } from 'idb-keyval';

/* ── Cache keys ─────────────────────────────────────────────────────── */
const CACHE_PREFIX = 'api_cache:';
const QUEUE_KEY = 'offline_mutation_queue';

/* ── GET cache helpers ──────────────────────────────────────────────── */

/** Build a deterministic cache key from a GET request config. */
export const cacheKey = (config) => {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${CACHE_PREFIX}${url}${params ? `?${params}` : ''}`;
};

/** Store a GET response in IndexedDB. */
export const cacheResponse = async (config, data) => {
  try {
    await set(cacheKey(config), {
      data,
      timestamp: Date.now(),
    });
  } catch {
    // Silently fail — caching is best-effort
  }
};

/** Retrieve a cached GET response (or null). */
export const getCachedResponse = async (config) => {
  try {
    const cached = await get(cacheKey(config));
    if (!cached) return null;

    // Consider cache stale after 30 minutes
    const MAX_AGE = 30 * 60 * 1000;
    if (Date.now() - cached.timestamp > MAX_AGE) return null;

    return cached.data;
  } catch {
    return null;
  }
};

/** Clear all cached responses. */
export const clearCache = async () => {
  try {
    const allKeys = await keys();
    await Promise.all(
      allKeys
        .filter((k) => typeof k === 'string' && k.startsWith(CACHE_PREFIX))
        .map((k) => del(k))
    );
  } catch {
    // noop
  }
};

/* ── Mutation queue ─────────────────────────────────────────────────── */

/** Push a failed mutation (POST/PUT/DELETE) onto the offline queue. */
export const queueMutation = async (config) => {
  try {
    const queue = (await get(QUEUE_KEY)) || [];
    queue.push({
      method: config.method,
      url: config.url,
      data: config.data,
      headers: { ...config.headers, Authorization: config.headers?.Authorization },
      timestamp: Date.now(),
    });
    await set(QUEUE_KEY, queue);
  } catch {
    // noop
  }
};

/** Get all queued mutations. */
export const getQueuedMutations = async () => {
  try {
    return (await get(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

/** Clear the mutation queue (after successful replay). */
export const clearQueue = async () => {
  try {
    await del(QUEUE_KEY);
  } catch {
    // noop
  }
};
