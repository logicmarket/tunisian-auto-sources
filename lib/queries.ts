/**
 * File: lib/queries.ts
 * Purpose: Read-only source catalogue access, now backed by PostgreSQL via
 * Prisma. Function signatures and returned record shapes are unchanged.
 *
 * PostgreSQL notes
 * • `COLLATE NOCASE` does not exist; case-insensitive ordering uses LOWER().
 * • `datetime(created_at)` from SQLite is replaced by native timestamptz
 *   ordering, which is index-friendly.
 * • COUNT(*) is cast to ::int so the JSON output stays a number instead of a
 *   BigInt (PostgreSQL COUNT returns bigint).
 */

import { Prisma, type Source } from "@prisma/client";
import { prisma, withDatabaseRetry } from "./db";
import {
  getLanguageLabel,
  getLinkStatusMeta,
  getSystemLabel,
  getTaskLabel,
} from "./labels";
import { toSourceRecord } from "./mappers";
import { ensureSeeded } from "./seed";
import type {
  CategoryCount,
  CategoryGroups,
  PortalStats,
  SourceFilters,
  SourcePage,
  SourceRecord,
  SourceSort,
} from "./types";
import { toFilterKey } from "./utils";

type FilterColumn =
  | "category_system"
  | "category_task"
  | "language"
  | "link_status";

const FILTER_COLUMNS: ReadonlySet<FilterColumn> = new Set([
  "category_system",
  "category_task",
  "language",
  "link_status",
]);

const distinctCache = new Map<FilterColumn, string[]>();
const resolvedFilterCache = new Map<string, string | null>();

async function getDistinctValues(column: FilterColumn): Promise<string[]> {
  const cached = distinctCache.get(column);
  if (cached) return cached;

  if (!FILTER_COLUMNS.has(column)) return [];

  const col = Prisma.raw(`"${column}"`);
  // PostgreSQL rejects `SELECT DISTINCT … ORDER BY LOWER(col)` because the
  // ORDER BY expression is not in the select list (SQLite allowed it), so the
  // case-insensitive sort happens in JS instead.
  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
        SELECT DISTINCT ${col} AS value
          FROM "sources"
         WHERE ${col} IS NOT NULL AND ${col} <> ''
           AND "is_hidden" = false
      `),
    { label: `distinct:${column}` },
  );

  const values = rows
    .map((row) => row.value)
    .sort((a, b) =>
      a.localeCompare(b, ["ar", "fr", "en"], { sensitivity: "base" }),
    );
  distinctCache.set(column, values);
  return values;
}

/** User-facing Arabic and English aliases for a canonical database value. */
function aliasesFor(column: FilterColumn, value: string): Set<string> {
  const label =
    column === "category_system"
      ? getSystemLabel(value)
      : column === "category_task"
        ? getTaskLabel(value)
        : column === "language"
          ? getLanguageLabel(value)
          : getLinkStatusMeta(value).label;

  const aliases = new Set<string>();
  for (const candidate of [
    value,
    label,
    value.replace(/&/g, " and "),
    value.replace(/&/g, ""),
  ]) {
    aliases.add(candidate.toLowerCase());
    aliases.add(toFilterKey(candidate));
  }
  return aliases;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  en: "English",
  eng: "English",
  english: "English",
  anglais: "English",
  ar: "Arabic",
  arab: "Arabic",
  arabic: "Arabic",
  arabe: "Arabic",
  fr: "French",
  french: "French",
  francais: "French",
  "français": "French",
  mixed: "Mixed / Multilingual",
  multi: "Mixed / Multilingual",
  multilingual: "Mixed / Multilingual",
  unknown: "Unknown",
  other: "Unknown",
};

/**
 * Resolves flexible API values to a canonical database value.
 * Examples: `system=engine` → `Engine`, `lang=fr` → `French`,
 * `task=obd` → `OBD / Error Codes`, `system=المحرك` → `Engine`.
 */
export async function resolveFilterValue(
  column: FilterColumn,
  input: string,
): Promise<string | null> {
  const raw = input.trim();
  if (!raw) return null;

  const cacheKey = `${column}::${toFilterKey(raw)}`;
  const cached = resolvedFilterCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const values = await getDistinctValues(column);
  const lower = raw.toLowerCase();
  const inputKey = toFilterKey(raw);

  // 1) Exact database value (case-insensitive).
  const exact = values.find((value) => value.toLowerCase() === lower);
  if (exact) {
    resolvedFilterCache.set(cacheKey, exact);
    return exact;
  }

  // 2) Explicit short codes, mainly for languages.
  if (column === "language") {
    const alias = LANGUAGE_ALIASES[inputKey] ?? LANGUAGE_ALIASES[lower];
    if (alias && values.includes(alias)) {
      resolvedFilterCache.set(cacheKey, alias);
      return alias;
    }
  }

  // 3) Arabic labels / slug aliases.
  const aliasMatches = values.filter((value) =>
    aliasesFor(column, value).has(inputKey),
  );
  if (aliasMatches.length === 1) {
    resolvedFilterCache.set(cacheKey, aliasMatches[0]);
    return aliasMatches[0];
  }

  // 4) Unambiguous prefix, e.g. `electrical` → `Electrical & Electronics`.
  const prefixMatches = values.filter((value) =>
    [...aliasesFor(column, value)].some((alias) =>
      alias.startsWith(`${inputKey}-`),
    ),
  );
  if (prefixMatches.length === 1) {
    resolvedFilterCache.set(cacheKey, prefixMatches[0]);
    return prefixMatches[0];
  }

  resolvedFilterCache.set(cacheKey, null);
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function listSources(
  filters: SourceFilters = {},
): Promise<SourceRecord[]> {
  await ensureSeeded();

  const where: Prisma.SourceWhereInput = { is_hidden: false };

  if (filters.system) {
    const value = await resolveFilterValue("category_system", filters.system);
    if (!value) return [];
    where.category_system = value;
  }

  if (filters.task) {
    const value = await resolveFilterValue("category_task", filters.task);
    if (!value) return [];
    where.category_task = value;
  }

  if (filters.language) {
    const value = await resolveFilterValue("language", filters.language);
    if (!value) return [];
    where.language = value;
  }

  if (filters.status) {
    const value = await resolveFilterValue("link_status", filters.status);
    if (!value) return [];
    where.link_status = value;
  }

  const hasLimit =
    typeof filters.limit === "number" && Number.isFinite(filters.limit);
  const limit = hasLimit ? clamp(Math.trunc(filters.limit!), 1, 500) : undefined;
  const offset = hasLimit
    ? clamp(Math.trunc(filters.offset ?? 0), 0, 100_000)
    : undefined;

  const rows = await prisma.source.findMany({
    where,
    orderBy: [{ rating: "desc" }, { name: "asc" }, { id: "asc" }],
    ...(typeof limit === "number" ? { take: limit } : {}),
    ...(typeof offset === "number" && offset > 0 ? { skip: offset } : {}),
  });

  return rows.map(toSourceRecord);
}

export async function getSourceById(id: number): Promise<SourceRecord | null> {
  await ensureSeeded();

  if (!Number.isInteger(id) || id <= 0) return null;

  const row = await prisma.source.findFirst({
    where: { id, is_hidden: false },
  });
  return row ? toSourceRecord(row) : null;
}

/**
 * Batch lookup used by the personal dashboard. Preserves the caller's order so
 * bookmarks and the comparison table stay stable between reloads.
 */
export async function getSourcesByIds(ids: number[]): Promise<SourceRecord[]> {
  await ensureSeeded();

  const unique = Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0)),
  ).slice(0, 100);

  if (unique.length === 0) return [];

  const rows = await prisma.source.findMany({
    where: { id: { in: unique }, is_hidden: false },
  });

  const map = new Map(rows.map((row) => [row.id, toSourceRecord(row)]));
  return unique
    .map((id) => map.get(id))
    .filter((row): row is SourceRecord => Boolean(row));
}

export async function getAllSources(): Promise<SourceRecord[]> {
  await ensureSeeded();
  const rows = await prisma.source.findMany({
    where: { is_hidden: false },
    orderBy: { id: "asc" },
  });
  return rows.map(toSourceRecord);
}

export async function getFeaturedSources(limit = 3): Promise<SourceRecord[]> {
  await ensureSeeded();
  const safeLimit = clamp(Math.trunc(limit), 1, 12);

  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT *
          FROM "sources"
         WHERE url <> ''
           AND "is_hidden" = false
         ORDER BY
           CASE link_status
             WHEN 'LIVE' THEN 0
             WHEN 'REDIRECT' THEN 1
             ELSE 2
           END,
           rating DESC,
           id ASC
         LIMIT ${safeLimit}
      `),
    { label: "featured-sources" },
  );

  return rows.map(toSourceRecord);
}

/** Newest additions, used on the homepage. */
export async function getLatestSources(limit = 8): Promise<SourceRecord[]> {
  await ensureSeeded();
  const safeLimit = clamp(Math.trunc(limit), 1, 24);

  const rows = await prisma.source.findMany({
    where: { url: { not: "" }, is_hidden: false },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: safeLimit,
  });
  return rows.map(toSourceRecord);
}

/** Highest-rated sources with a small bonus for verified live links. */
export async function getTopRatedSources(limit = 8): Promise<SourceRecord[]> {
  await ensureSeeded();
  const safeLimit = clamp(Math.trunc(limit), 1, 24);

  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT *
          FROM "sources"
         WHERE url <> ''
           AND "is_hidden" = false
         ORDER BY
           rating DESC,
           CASE link_status
             WHEN 'LIVE' THEN 0
             WHEN 'REDIRECT' THEN 1
             ELSE 2
           END,
           id ASC
         LIMIT ${safeLimit}
      `),
    { label: "top-rated-sources" },
  );

  return rows.map(toSourceRecord);
}

function sortSources(items: SourceRecord[], sort: SourceSort): SourceRecord[] {
  const copy = [...items];
  if (sort === "latest") {
    return copy.sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id - a.id,
    );
  }
  if (sort === "name") {
    return copy.sort((a, b) =>
      a.name.localeCompare(b.name, ["ar", "fr", "en"], { sensitivity: "base" }),
    );
  }
  return copy.sort(
    (a, b) =>
      b.rating - a.rating ||
      Number(b.link_status === "LIVE") - Number(a.link_status === "LIVE") ||
      a.name.localeCompare(b.name, ["ar", "fr", "en"], { sensitivity: "base" }),
  );
}

/**
 * Paginated listing used by `/sources` and `/categories/[system]`.
 * Filtering happens in SQL; sorting/slicing is in memory because the
 * publishable corpus is intentionally small (< 500 rows).
 */
export async function getSourcesPage(
  filters: SourceFilters = {},
  page = 1,
  pageSize = 12,
  sort: SourceSort = "rating",
): Promise<SourcePage> {
  await ensureSeeded();

  const safePageSize = clamp(Math.trunc(pageSize), 1, 48);
  const all = sortSources(await listSources(filters), sort);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = clamp(Math.trunc(page), 1, totalPages);
  const offset = (safePage - 1) * safePageSize;

  return {
    items: all.slice(offset, offset + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/** Related sources prefer the same system, then the same task. */
export async function getRelatedSources(
  sourceId: number,
  system: string,
  task: string,
  limit = 6,
): Promise<SourceRecord[]> {
  await ensureSeeded();
  const safeLimit = clamp(Math.trunc(limit), 1, 12);

  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT *
          FROM "sources"
         WHERE id <> ${sourceId}
           AND url <> ''
           AND "is_hidden" = false
           AND (category_system = ${system} OR category_task = ${task})
         ORDER BY
           CASE WHEN category_system = ${system} THEN 0 ELSE 1 END,
           rating DESC,
           CASE link_status
             WHEN 'LIVE' THEN 0
             WHEN 'REDIRECT' THEN 1
             ELSE 2
           END,
           id ASC
         LIMIT ${safeLimit}
      `),
    { label: "related-sources" },
  );

  return rows.map(toSourceRecord);
}

/** Date of the most recent manual link verification, shown in the footer. */
export async function getLastVerifiedDate(): Promise<string | null> {
  await ensureSeeded();
  const aggregate = await prisma.source.aggregate({
    _max: { last_verified: true },
    where: { last_verified: { not: null }, is_hidden: false },
  });
  return aggregate._max.last_verified ?? null;
}

async function countBy(
  column: FilterColumn,
  system?: string,
): Promise<CategoryCount[]> {
  if (!FILTER_COLUMNS.has(column)) return [];

  const col = Prisma.raw(`"${column}"`);
  const filter = system
    ? Prisma.sql`AND "category_system" = ${system}`
    : Prisma.empty;

  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Array<{ value: string; count: number }>>(Prisma.sql`
        SELECT ${col} AS value, COUNT(*)::int AS count
          FROM "sources"
         WHERE ${col} IS NOT NULL AND ${col} <> ''
           AND "is_hidden" = false
         ${filter}
         GROUP BY ${col}
         ORDER BY count DESC, LOWER(${col}) ASC
      `),
    { label: `count-by:${column}` },
  );

  return rows.map((row) => ({ value: row.value, count: Number(row.count) }));
}

export async function getCategoryCounts(): Promise<CategoryGroups> {
  await ensureSeeded();

  const [systems, tasks, languages, statuses, total] = await Promise.all([
    countBy("category_system"),
    countBy("category_task"),
    countBy("language"),
    countBy("link_status"),
    prisma.source.count({ where: { is_hidden: false } }),
  ]);

  return { systems, tasks, languages, statuses, total };
}

/**
 * Category counts restricted to one system. The category page uses these so
 * the filter panel never offers a task/language that would return zero rows
 * inside the current system.
 */
export async function getCategoryCountsForSystem(
  system: string,
): Promise<CategoryGroups> {
  await ensureSeeded();

  const resolved = await resolveFilterValue("category_system", system);
  if (!resolved) {
    return { systems: [], tasks: [], languages: [], statuses: [], total: 0 };
  }

  const [tasks, languages, statuses, total] = await Promise.all([
    countBy("category_task", resolved),
    countBy("language", resolved),
    countBy("link_status", resolved),
    prisma.source.count({ where: { category_system: resolved, is_hidden: false } }),
  ]);

  return {
    systems: [{ value: resolved, count: total }],
    tasks,
    languages,
    statuses,
    total,
  };
}

export async function getPortalStats(): Promise<PortalStats> {
  await ensureSeeded();

  const rows = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<
        Array<{
          totalSources: number;
          liveSources: number;
          redirectSources: number;
          arabicSources: number;
          systemCount: number;
          taskCount: number;
          averageRating: number;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*)::int AS "totalSources",
          COALESCE(SUM(CASE WHEN link_status = 'LIVE' THEN 1 ELSE 0 END), 0)::int AS "liveSources",
          COALESCE(SUM(CASE WHEN link_status = 'REDIRECT' THEN 1 ELSE 0 END), 0)::int AS "redirectSources",
          COALESCE(SUM(CASE WHEN language = 'Arabic' THEN 1 ELSE 0 END), 0)::int AS "arabicSources",
          COUNT(DISTINCT category_system)::int AS "systemCount",
          COUNT(DISTINCT category_task)::int AS "taskCount",
          COALESCE(AVG(rating), 0)::double precision AS "averageRating"
        FROM "sources"
        WHERE "is_hidden" = false
      `),
    { label: "portal-stats" },
  );

  const row = rows[0];
  return {
    ...row,
    averageRating: Number(Number(row.averageRating).toFixed(1)),
  };
}
