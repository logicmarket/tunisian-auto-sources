/**
 * File: lib/params.ts
 * Purpose: Small helpers for reading App Router search params safely.
 * Next.js may hand a page either a string or an array for the same key.
 */

import type { SourceSort } from "./types";

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = candidate?.trim();
  return trimmed ? trimmed : undefined;
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Number(firstParam(value) ?? "1");
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.trunc(raw));
}

export function parseSort(
  value: string | string[] | undefined,
): SourceSort {
  const raw = firstParam(value);
  if (raw === "latest" || raw === "name") return raw;
  return "rating";
}
