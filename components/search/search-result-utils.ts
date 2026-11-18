/**
 * File: components/search/search-result-utils.ts
 * Purpose: Flatten the grouped search payload into one keyboard-navigable
 * list while keeping group metadata for headings.
 */

import { getSystemLabelSafe, getTaskLabelSafe } from "@/lib/catalog";
import { getLanguageLabel, getObdCategoryLabel } from "@/lib/labels";
import type { ObdCodeRecord, SearchPortalResult, SourceRecord } from "@/lib/types";

export type SearchItemType = "source" | "category" | "obd";

export interface FlatSearchItem {
  key: string;
  type: SearchItemType;
  href: string;
  title: string;
  snippet: string;
  meta: string;
  source?: SourceRecord;
  obd?: ObdCodeRecord;
  categoryLabel?: string;
}

export function flattenSearchResults(
  data: SearchPortalResult | null,
  compact = false,
): FlatSearchItem[] {
  if (!data) return [];

  const sourceLimit = compact ? 4 : data.sources.length;
  const categoryLimit = compact ? 3 : data.categories.length;
  const obdLimit = compact ? 3 : data.obd.length;

  const sources: FlatSearchItem[] = data.sources
    .slice(0, sourceLimit)
    .map((source) => ({
      key: `source-${source.id}`,
      type: "source" as const,
      href: `/sources/${source.id}`,
      title: source.name,
      snippet: source.description_ar,
      meta: `${getSystemLabelSafe(source.category_system)} · ${getTaskLabelSafe(
        source.category_task,
      )} · ${getLanguageLabel(source.language)}`,
      source,
    }));

  const categories: FlatSearchItem[] = data.categories
    .slice(0, categoryLimit)
    .map((category) => ({
      key: `category-${category.kind}-${category.slug}`,
      type: "category" as const,
      href: category.href,
      title: category.label,
      snippet: category.description,
      meta:
        category.kind === "system"
          ? `نظام سيارة · ${category.count} مصدر`
          : `نوع مهمة · ${category.count} مصدر`,
      categoryLabel: category.kind === "system" ? "نظام" : "مهمة",
    }));

  const obd: FlatSearchItem[] = data.obd.slice(0, obdLimit).map((code) => ({
    key: `obd-${code.code}`,
    type: "obd" as const,
    href: `/obd-codes/${code.code}`,
    title: code.name_ar ?? code.code,
    snippet: code.description ?? "كود عطل مسجّل في قاعدة البيانات.",
    meta: `${code.code} · ${getObdCategoryLabel(code.category)}`,
    obd: code,
  }));

  return [...sources, ...categories, ...obd];
}

export function groupCounts(data: SearchPortalResult | null) {
  return {
    sources: data?.sources.length ?? 0,
    categories: data?.categories.length ?? 0,
    obd: data?.obd.length ?? 0,
  };
}
