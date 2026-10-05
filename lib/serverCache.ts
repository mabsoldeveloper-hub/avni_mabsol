
interface CacheRecord<T> {
  data: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheRecord<any>>();
const activePromises = new Map<string, Promise<any>>();

export async function fetchWithServerCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  bypassCache = false
): Promise<T> {
  const now = Date.now();

  // 1. Check memory cache if not bypassing
  if (!bypassCache) {
    const cached = memoryStore.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  // 2. Check if identical request is currently in-flight
  if (!bypassCache) {
    const inFlight = activePromises.get(key);
    if (inFlight) {
      return inFlight;
    }
  }

  // 3. Execute and store in-flight promise
  const execution = (async () => {
    try {
      const result = await fetcher();
      // Store in memory cache
      memoryStore.set(key, {
        data: result,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });

      // Cleanup old cache entries periodically if store grows
      if (memoryStore.size > 200) {
        const cleanupNow = Date.now();
        for (const [k, v] of memoryStore.entries()) {
          if (v.expiresAt <= cleanupNow) {
            memoryStore.delete(k);
          }
        }
      }

      return result;
    } finally {
      activePromises.delete(key);
    }
  })();

  activePromises.set(key, execution);
  return execution;
}

export function invalidateServerCache(pattern?: string) {
  if (!pattern) {
    memoryStore.clear();
    return;
  }
  for (const k of memoryStore.keys()) {
    if (k.includes(pattern)) {
      memoryStore.delete(k);
    }
  }
}
