"use client";

/**
 * File: components/obd/ObdExplorer.tsx
 * Purpose: Instant client-side OBD browser for the 400+ code corpus:
 * full-text search, P/B/C/U family tabs, severity filter and pagination.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ScanLine,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  getObdCategoryLabel,
  getSeverityMeta,
  severityToneClasses,
} from "@/lib/labels";
import type { CategoryCount, ObdCodeRecord } from "@/lib/types";
import { cn, formatNumber, normalizeSearchText } from "@/lib/utils";

const PAGE_SIZE = 50;

const FAMILY_ORDER = ["P", "B", "C", "U"];

const FAMILY_SHORT_LABELS: Record<string, string> = {
  P: "محرك",
  B: "هيكل",
  C: "عجلات",
  U: "شبكة",
};

interface ObdExplorerProps {
  codes: ObdCodeRecord[];
  categories: CategoryCount[];
  severities: CategoryCount[];
  initialCategory?: string;
  initialSeverity?: string;
}

export function ObdExplorer({
  codes,
  categories,
  severities,
  initialCategory,
  initialSeverity,
}: ObdExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategory ?? null,
  );
  const [activeSeverity, setActiveSeverity] = useState<string | null>(
    initialSeverity ?? null,
  );
  const [page, setPage] = useState(1);

  const normalized = normalizeSearchText(query.trim());

  const filtered = useMemo(() => {
    return codes.filter((code) => {
      if (activeCategory && code.category !== activeCategory) return false;
      if (activeSeverity && code.severity !== activeSeverity) return false;
      if (!normalized) return true;

      const haystack = normalizeSearchText(
        [
          code.code,
          code.name_ar ?? "",
          code.name_en ?? "",
          code.system_category ?? "",
          code.related_system ?? "",
          code.description ?? "",
        ].join(" "),
      );
      return haystack.includes(normalized);
    });
  }, [codes, activeCategory, activeSeverity, normalized]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, activeCategory, activeSeverity]);

  const hasFilters = Boolean(query.trim() || activeCategory || activeSeverity);

  const familyCounts = useMemo(() => {
    const map = new Map(categories.map((c) => [c.value, c.count]));
    return FAMILY_ORDER.map((letter) => ({
      letter,
      count: map.get(letter) ?? 0,
    }));
  }, [categories]);

  return (
    <div>
      <div className="surface-card p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised/70 p-1.5 transition-colors focus-within:border-accent/50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-accent-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب الكود (مثال: P0301)"
            aria-label="البحث في أكواد OBD"
            dir="rtl"
            className="h-12 min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-muted/70 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted/70">
              مجموعة الكود
            </p>
            <div className="flex gap-1.5" role="group" aria-label="تصفية حسب مجموعة الكود">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                aria-pressed={activeCategory === null}
                className={cn(
                  "inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors",
                  activeCategory === null
                    ? "border-accent bg-accent text-background"
                    : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
                )}
              >
                الكل
                <span className="tabular-nums opacity-70">{formatNumber(codes.length)}</span>
              </button>
              {familyCounts.map((family) => (
                <button
                  key={family.letter}
                  type="button"
                  onClick={() =>
                    setActiveCategory(
                      activeCategory === family.letter ? null : family.letter,
                    )
                  }
                  aria-pressed={activeCategory === family.letter}
                  title={getObdCategoryLabel(family.letter)}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition-colors",
                    activeCategory === family.letter
                      ? "border-accent bg-accent text-background"
                      : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
                  )}
                >
                  <span className="font-mono" dir="ltr">{family.letter}</span>
                  <span className="text-[9px] font-semibold opacity-80">
                    {FAMILY_SHORT_LABELS[family.letter]}
                  </span>
                  <span className="hidden tabular-nums opacity-60 sm:inline">
                    {formatNumber(family.count)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted/70">
              درجة الخطورة
            </p>
            <div className="flex gap-1.5" role="group" aria-label="تصفية حسب الخطورة">
              <button
                type="button"
                onClick={() => setActiveSeverity(null)}
                aria-pressed={activeSeverity === null}
                className={cn(
                  "min-h-12 flex-1 rounded-lg border px-2 text-[11px] font-bold transition-colors",
                  activeSeverity === null
                    ? "border-accent bg-accent text-background"
                    : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
                )}
              >
                الكل
              </button>
              {severities.map((severity) => {
                const meta = getSeverityMeta(severity.value);
                return (
                  <button
                    key={severity.value}
                    type="button"
                    onClick={() =>
                      setActiveSeverity(
                        activeSeverity === severity.value ? null : severity.value,
                      )
                    }
                    aria-pressed={activeSeverity === severity.value}
                    className={cn(
                      "min-h-12 flex-1 rounded-lg border px-1 text-[10px] font-bold transition-colors",
                      activeSeverity === severity.value
                        ? "border-accent bg-accent text-background"
                        : `${severityToneClasses[meta.tone]} hover:opacity-90`,
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted" aria-live="polite">
          <span className="font-bold tabular-nums text-muted-strong">
            {formatNumber(filtered.length)}
          </span>{" "}
          كود
          {activeCategory ? ` في ${getObdCategoryLabel(activeCategory)}` : ""}
          {activeSeverity ? ` · ${getSeverityMeta(activeSeverity).label}` : ""}
          {query.trim() ? ` · يطابق «${query.trim()}»` : ""}
        </p>

        <div className="flex items-center gap-3">
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory(null);
                setActiveSeverity(null);
              }}
              className="text-[11px] font-bold text-accent-300 transition-colors hover:text-accent-200"
            >
              إعادة تعيين
            </button>
          ) : null}
          <span className="text-[11px] text-muted">
            صفحة {formatNumber(safePage)} / {formatNumber(totalPages)}
          </span>
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="mt-3 grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((code) => {
              const severity = getSeverityMeta(code.severity);
              return (
                <Link
                  key={code.code}
                  href={`/obd-codes/${code.code}`}
                  className="surface-card group flex min-w-0 items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-accent-glow"
                >
                  <span className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.07] text-accent-300">
                    <ScanLine className="h-3 w-3 opacity-70" aria-hidden="true" />
                    <span
                      className="font-mono text-[11px] font-extrabold tracking-tight"
                      dir="ltr"
                    >
                      {code.code}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-start text-sm font-bold leading-snug text-white transition-colors group-hover:text-accent-200">
                      {code.name_ar ?? "كود عطل مسجّل"}
                    </span>
                    {code.name_en ? (
                      <span
                        className="mt-0.5 block truncate text-start text-[10px] text-muted/70"
                        dir="ltr"
                      >
                        {code.name_en}
                      </span>
                    ) : null}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {code.system_category ?? getObdCategoryLabel(code.category)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          severityToneClasses[severity.tone],
                        )}
                      >
                        {severity.tone === "critical" || severity.tone === "high" ? (
                          <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
                        ) : null}
                        {severity.label}
                      </span>
                      {code.verification === "UNVERIFIED" ? (
                        <span className="inline-flex rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-bold text-violet-300">
                          UNVERIFIED
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <ArrowLeft
                    className="mt-2 h-3.5 w-3.5 shrink-0 text-muted/50 transition-all group-hover:-translate-x-0.5 group-hover:text-accent-300"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <nav
              className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
              aria-label="صفحات الأكواد"
            >
              <button
                type="button"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                السابق
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter(
                  (number) =>
                    number === 1 ||
                    number === totalPages ||
                    Math.abs(number - safePage) <= 2,
                )
                .map((number, index, list) => {
                  const previous = list[index - 1];
                  const gap = previous && number - previous > 1;
                  return (
                    <span key={number} className="flex items-center gap-1.5">
                      {gap ? <span className="px-1 text-muted/50">…</span> : null}
                      <button
                        type="button"
                        onClick={() => setPage(number)}
                        aria-current={safePage === number ? "page" : undefined}
                        className={cn(
                          "h-12 min-w-12 rounded-lg border px-2 text-[11px] font-bold tabular-nums transition-colors",
                          safePage === number
                            ? "border-accent bg-accent text-background"
                            : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
                        )}
                      >
                        {formatNumber(number)}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="surface-card mt-3 flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
            <ScanLine className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-extrabold text-white">
            لا توجد أكواد مطابقة
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-6 text-muted">
            جرّب كوداً بصيغة P0301، أو ابحث باسم العطل بالعربية. يمكنك أيضاً إزالة
            فلاتر المجموعة والخطورة.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory(null);
              setActiveSeverity(null);
            }}
            className="mt-4 min-h-12 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            إعادة تعيين البحث
          </button>
        </div>
      )}
    </div>
  );
}
