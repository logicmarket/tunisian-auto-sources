/**
 * File: lib/obd.ts
 * Purpose: Read-only access to the OBD-II catalogue, now backed by PostgreSQL
 * via Prisma. Search stays in memory because the catalogue is only ~442 rows
 * and this preserves the existing Arabic-aware scoring exactly.
 */

import { prisma } from "./db";
import { toObdCodeRecord } from "./mappers";
import { ensureSeeded } from "./seed";
import type { CategoryCount, ObdCodeRecord } from "./types";
import { normalizeSearchText } from "./utils";

/** Editorial priority used on the homepage quick-access strip. */
const COMMON_CODE_ORDER = [
  "P0300",
  "P0301",
  "P0302",
  "P0303",
  "P0304",
  "P0171",
  "P0172",
  "P0420",
  "P0430",
  "P0101",
  "P0102",
  "P0113",
  "P0118",
  "P0128",
  "P0135",
  "P0442",
  "P0455",
  "P0505",
  "P0700",
  "U0100",
];

function byCommonOrder(a: ObdCodeRecord, b: ObdCodeRecord): number {
  const aIndex = COMMON_CODE_ORDER.indexOf(a.code);
  const bIndex = COMMON_CODE_ORDER.indexOf(b.code);
  const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
  if (aRank !== bRank) return aRank - bRank;
  return a.code.localeCompare(b.code);
}

function sortCounts(
  rows: Array<{ value: string; count: number }>,
  severityOrder = false,
): CategoryCount[] {
  if (severityOrder) {
    const weight: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return rows.sort(
      (a, b) =>
        (weight[a.value] ?? 9) - (weight[b.value] ?? 9) ||
        b.count - a.count,
    );
  }
  return rows.sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, "en"),
  );
}

export async function getAllObdCodes(): Promise<ObdCodeRecord[]> {
  await ensureSeeded();
  const rows = await prisma.obdCode.findMany({ orderBy: { code: "asc" } });
  return rows.map(toObdCodeRecord);
}

export async function getCommonObdCodes(limit = 10): Promise<ObdCodeRecord[]> {
  const codes = await getAllObdCodes();
  return [...codes].sort(byCommonOrder).slice(0, Math.max(1, limit));
}

export async function getObdCodeByCode(
  code: string,
): Promise<ObdCodeRecord | null> {
  await ensureSeeded();
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z][0-9A-F]{4}$/.test(normalized)) return null;

  // `mode: "insensitive"` replaces SQLite's COLLATE NOCASE.
  const row = await prisma.obdCode.findFirst({
    where: { code: { equals: normalized, mode: "insensitive" } },
  });

  return row ? toObdCodeRecord(row) : null;
}

export async function getObdCount(): Promise<number> {
  await ensureSeeded();
  return prisma.obdCode.count();
}

export async function getObdCategoryCounts(): Promise<CategoryCount[]> {
  await ensureSeeded();
  const rows = await prisma.obdCode.groupBy({
    by: ["category"],
    where: { category: { not: "" } },
    _count: { _all: true },
  });

  return sortCounts(
    rows.map((row) => ({ value: row.category, count: row._count._all })),
  );
}

/** Lightweight in-memory search across 400+ codes; normalises Arabic. */
export async function searchObdCodes(
  query: string,
  limit = 8,
): Promise<ObdCodeRecord[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalized = normalizeSearchText(trimmed);
  const upper = trimmed.toUpperCase();
  const codes = await getAllObdCodes();

  const scored = codes
    .map((code) => {
      let score = 0;
      if (code.code === upper) score += 100;
      else if (code.code.startsWith(upper)) score += 60;
      if (normalizeSearchText(code.name_ar ?? "").includes(normalized)) score += 30;
      if (normalizeSearchText(code.name_en ?? "").includes(normalized)) score += 22;
      if (normalizeSearchText(code.system_category ?? "").includes(normalized)) score += 14;
      if (normalizeSearchText(code.code).includes(normalized)) score += 10;
      if (normalizeSearchText(code.description ?? "").includes(normalized)) score += 6;
      return { code, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        byCommonOrder(a.code, b.code) ||
        a.code.code.localeCompare(b.code.code),
    )
    .slice(0, Math.max(1, limit));

  return scored.map((entry) => entry.code);
}

/**
 * Related codes share the same diagnostic family (e.g. all coil-circuit
 * codes), falling back to the same vehicle system when a family is unique.
 */
export async function getRelatedObdCodes(
  code: string,
  familyOrCategory: string,
  limit = 4,
): Promise<ObdCodeRecord[]> {
  const codes = await getAllObdCodes();
  const target = codes.find((entry) => entry.code === code);
  if (!target) return [];

  const sameFamily = codes.filter(
    (entry) =>
      entry.code !== code &&
      target.family &&
      entry.family === target.family,
  );

  const pool =
    sameFamily.length > 0
      ? sameFamily
      : codes.filter(
          (entry) =>
            entry.code !== code &&
            (entry.system_category === target.system_category ||
              entry.category === familyOrCategory),
        );

  return pool.sort(byCommonOrder).slice(0, limit);
}

export async function getObdSystemCounts(): Promise<CategoryCount[]> {
  await ensureSeeded();
  const rows = await prisma.obdCode.groupBy({
    by: ["system_category"],
    where: { system_category: { not: null } },
    _count: { _all: true },
  });

  const counts: CategoryCount[] = [];
  for (const row of rows) {
    if (row.system_category) {
      counts.push({ value: row.system_category, count: row._count._all });
    }
  }
  return sortCounts(counts);
}

export async function getObdSeverityCounts(): Promise<CategoryCount[]> {
  await ensureSeeded();
  const rows = await prisma.obdCode.groupBy({
    by: ["severity"],
    _count: { _all: true },
  });

  const counts: CategoryCount[] = [];
  for (const row of rows) {
    if (row.severity) {
      counts.push({ value: row.severity, count: row._count._all });
    }
  }
  return sortCounts(counts, true);
}
