"use client";

/**
 * File: components/ui/FilterPanel.tsx
 * Purpose: Client-side filter controls for system, task, and language.
 * Filters are URL-driven (shareable, back-button friendly) and update
 * instantly without a full page reload.
 */

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import {
  getLanguageSlug,
  getSystemLabelSafe,
  getSystemMeta,
  getTaskLabelSafe,
  getTaskMeta,
  sourceCountLabel,
} from "@/lib/catalog";
import { getLanguageLabel } from "@/lib/labels";
import type { CategoryCount } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export interface ActiveFilters {
  system?: string;
  task?: string;
  language?: string;
}

interface FilterPanelProps {
  basePath: string;
  tasks: CategoryCount[];
  languages: CategoryCount[];
  systems?: CategoryCount[];
  active: ActiveFilters;
  showSystem?: boolean;
  /** Extra params to preserve when filters change (e.g. sort). */
  preserve?: Record<string, string | undefined>;
}

export function FilterPanel({
  basePath,
  tasks,
  languages,
  systems = [],
  active,
  showSystem = false,
  preserve = {},
}: FilterPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [active.system, active.task, active.language].filter(
    Boolean,
  ).length;

  function navigate(next: ActiveFilters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserve)) {
      if (value) params.set(key, value);
    }
    if (next.system) params.set("system", next.system);
    if (next.task) params.set("task", next.task);
    if (next.language) params.set("language", next.language);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  }

  function toggle(key: keyof ActiveFilters, value: string) {
    const next: ActiveFilters = { ...active };
    if (next[key] === value) {
      delete next[key];
    } else {
      next[key] = value;
    }
    navigate(next);
  }

  function reset() {
    navigate({});
  }

  return (
    <section
      aria-label="تصفية المصادر"
      className={cn(
        "surface-card p-4 transition-opacity sm:p-5",
        isPending && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-accent-400">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-bold text-white">الفلاتر</h2>
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-extrabold tabular-nums text-background">
              {formatNumber(activeCount)}
            </span>
          ) : null}
        </div>

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-muted-strong transition-colors hover:bg-surface-raised hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            إعادة تعيين
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="filter-panel-body"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11px] font-bold text-muted-strong transition-colors hover:text-white lg:hidden"
        >
          {mobileOpen ? "إخفاء" : "عرض"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              mobileOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id="filter-panel-body"
        className={cn("mt-5 space-y-6", !mobileOpen && "hidden lg:block")}
      >
        {showSystem && systems.length > 0 ? (
          <FilterGroup
            title="النظام"
            items={systems.map((item) => {
              const slug = getSystemMeta(item.value)?.slug ?? item.value;
              return {
                key: item.value,
                label: getSystemLabelSafe(item.value),
                count: item.count,
                selected: active.system === slug,
                onSelect: () => toggle("system", slug),
              };
            })}
          />
        ) : null}

        <FilterGroup
          title="المهمة"
          items={tasks.map((item) => {
            const slug = getTaskMeta(item.value)?.slug ?? item.value;
            return {
              key: item.value,
              label: getTaskLabelSafe(item.value),
              count: item.count,
              selected: active.task === slug,
              onSelect: () => toggle("task", slug),
            };
          })}
        />

        <FilterGroup
          title="اللغة"
          items={languages.map((item) => ({
            key: item.value,
            label: getLanguageLabel(item.value),
            count: item.count,
            selected: active.language === getLanguageSlug(item.value),
            onSelect: () => toggle("language", getLanguageSlug(item.value)),
          }))}
        />

        {activeCount > 0 ? (
          <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
            <p className="text-[11px] leading-5 text-accent-200">
              {activeCount === 1
                ? "فلتر واحد مطبّق على النتائج."
                : `${formatNumber(activeCount)} فلاتر مطبّقة على النتائج.`}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/25 px-2.5 text-[11px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              مسح كل الفلاتر
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface FilterGroupItem {
  key: string;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}

function FilterGroup({
  title,
  items,
}: {
  title: string;
  items: FilterGroupItem[];
}) {
  return (
    <fieldset>
      <legend className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.selected}
            onClick={item.onSelect}
            title={sourceCountLabel(item.count)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              item.selected
                ? "border-accent bg-accent text-background"
                : "border-line bg-surface-raised text-muted-strong hover:border-accent/40 hover:text-white",
            )}
          >
            {item.selected ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {item.label}
            <span
              className={cn(
                "tabular-nums",
                item.selected ? "text-background/70" : "text-muted/70",
              )}
            >
              {formatNumber(item.count)}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
