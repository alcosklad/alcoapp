/**
 * Lightweight cache manager with in-memory + localStorage persistence.
 * Supports TTL (time-to-live) and stale-while-revalidate pattern.
 */

const memoryCache = new Map();
const STORAGE_PREFIX = 'ns_cache_';

// Read from localStorage (fallback if not in memory)
function readStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

// Write to both memory and localStorage
function writeCache(key, data, ttlMs) {
  const entry = { data, ts: Date.now(), ttl: ttlMs };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — memory-only is fine
  }
}

// Get cached entry (memory first, then localStorage)
function getEntry(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  const stored = readStorage(key);
  if (stored) {
    memoryCache.set(key, stored); // promote to memory
    return stored;
  }
  return null;
}

// Check if entry is still fresh
function isFresh(entry) {
  if (!entry) return false;
  return Date.now() - entry.ts < entry.ttl;
}

/**
 * Main API: get cached data or fetch fresh.
 * - If cache is fresh → return cached, no fetch.
 * - If cache is stale but exists → return cached immediately, fetch in background (stale-while-revalidate).
 * - If no cache → fetch, cache, return.
 *
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function that returns data
 * @param {number} ttlMs - Time-to-live in milliseconds (default 60s)
 * @param {Function} [onUpdate] - Optional callback when background refresh completes (for setState)
 * @returns {Promise<any>}
 */
export async function getOrFetch(key, fetchFn, ttlMs = 60000, onUpdate = null) {
  const entry = getEntry(key);

  if (isFresh(entry)) {
    return entry.data;
  }

  // Stale but exists — return stale, refresh in background
  if (entry) {
    // Background refresh
    fetchFn().then(freshData => {
      writeCache(key, freshData, ttlMs);
      if (onUpdate) onUpdate(freshData);
    }).catch(() => {});
    return entry.data;
  }

  // No cache at all — must fetch
  const data = await fetchFn();
  writeCache(key, data, ttlMs);
  return data;
}

/**
 * Invalidate cache entries by prefix.
 * e.g. invalidate('stocks') removes 'stocks', 'stocks:abc123', etc.
 */
export function invalidate(prefix) {
  // Memory
  for (const key of memoryCache.keys()) {
    if (key === prefix || key.startsWith(prefix + ':')) {
      memoryCache.delete(key);
    }
  }
  // localStorage
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX + prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Set cache directly (useful for manual pre-caching).
 */
export function setCache(key, data, ttlMs = 60000) {
  writeCache(key, data, ttlMs);
}

/**
 * Get cached value without fetching. Returns null if not cached.
 */
export function getCached(key) {
  const entry = getEntry(key);
  return entry ? entry.data : null;
}

/**
 * Clear all cache entries.
 */
export function clearAll() {
  memoryCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
