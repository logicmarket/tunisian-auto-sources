/**
 * File: lib/search-portal.ts
 * Purpose: Unified search across the three result types the interface
 * exposes: sources, categories, and OBD codes. Used by /api/search and the
 * full /search page so both stay consistent.
 */

import {
  SYSTEM_META,
  TASK_META,
  systemHref,
  taskHref,
} from "./catalog";
import { searchObdCodes } from "./obd";
import { getCategoryCounts } from "./queries";
import { searchSources } from "./search";
import type {
  SearchCategoryResult,
  SearchPortalResult,
} from "./types";
import { normalizeSearchText } from "./utils";

interface SearchOptions {
  sourceLimit?: number;
  obdLimit?: number;
  categoryLimit?: number;
}

function matches(haystack: string[], normalizedQuery: string): boolean {
  return haystack.some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  );
}

export async function searchPortal(
  query: string,
  options: SearchOptions = {},
): Promise<SearchPortalResult> {
  const trimmed = query.trim().slice(0, 120);

  if (trimmed.length < 2) {
    return {
      query: trimmed,
      total: 0,
      sources: [],
      categories: [],
      obd: [],
    };
  }

  const normalized = normalizeSearchText(trimmed);
  const { sourceLimit = 24, obdLimit = 8, categoryLimit = 8 } = options;

  const [sourceOutcome, counts, obd] = await Promise.all([
    searchSources(trimmed, sourceLimit),
    getCategoryCounts(),
    searchObdCodes(trimmed, obdLimit),
  ]);

  const systemCounts = new Map(counts.systems.map((item) => [item.value, item.count]));
  const taskCounts = new Map(counts.tasks.map((item) => [item.value, item.count]));

  const categories: SearchCategoryResult[] = [
    ...SYSTEM_META.map((system): SearchCategoryResult | null => {
      if (
        !matches(
          [system.label, system.shortLabel, system.value, system.description],
          normalized,
        )
      ) {
        return null;
      }
      return {
        kind: "system",
        value: system.value,
        slug: system.slug,
        label: system.label,
        description: system.description,
        count: systemCounts.get(system.value) ?? 0,
        href: systemHref(system.value),
      };
    }),
    ...TASK_META.map((task): SearchCategoryResult | null => {
      if (
        !matches(
          [task.label, task.quickLabel, task.value, task.description],
          normalized,
        )
      ) {
        return null;
      }
      return {
        kind: "task",
        value: task.value,
        slug: task.slug,
        label: task.label,
        description: task.description,
        count: taskCounts.get(task.value) ?? 0,
        href: taskHref(task.value),
      };
    }),
  ]
    .filter((entry): entry is SearchCategoryResult => entry !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, categoryLimit);

  const sources = sourceOutcome.results;

  return {
    query: trimmed,
    total: sources.length + categories.length + obd.length,
    sources,
    categories,
    obd,
  };
}
