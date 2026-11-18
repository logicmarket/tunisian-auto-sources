/**
 * File: lib/phase4/cache.ts
 * Purpose: Tiny LRU cache (max 100 entries by default) used by the diagnosis
 * API and the client-side fetch helper. No external dependencies.
 */

export class LruCache<T> {
  private readonly max: number;
  private readonly map = new Map<string, { value: T; expires: number }>();

  constructor(max = 100, private readonly ttlMs = 5 * 60 * 1000) {
    this.max = Math.max(1, max);
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + ttlMs });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/** Shared server cache for expensive diagnosis lookups. */
export const diagnosisCache = new LruCache<unknown>(100);

/** Browser-side cache for API responses, one entry per URL. */
const clientCache = new LruCache<unknown>(100, 60 * 1000);

export async function fetchJsonCached<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${url}`;

  if (method === "GET") {
    const cached = clientCache.get(cacheKey) as T | undefined;
    if (cached !== undefined) return cached;
  }

  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "تعذر إكمال الطلب. حاول مرة أخرى.");
  }

  if (method === "GET") clientCache.set(cacheKey, payload);
  return payload;
}
