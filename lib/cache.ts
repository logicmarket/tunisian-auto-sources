/**
 * File: lib/cache.ts
 * Purpose: Shared Cache-Control policies for read-only API routes. Writes and
 * private/admin routes must keep `no-store`.
 */

/** Catalogue reads: 5 min at the CDN, 10 min stale-while-revalidate. */
export const PUBLIC_CACHE = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

/** Rarely-changing reference data: 1 hour fresh, 1 day SWR. */
export const PUBLIC_LONG_CACHE = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

/** Counters such as ratings: 1 min fresh, 2 min SWR. */
export const PUBLIC_SHORT_CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};
