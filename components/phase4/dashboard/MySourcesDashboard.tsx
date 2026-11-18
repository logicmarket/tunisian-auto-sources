"use client";

/**
 * File: components/phase4/dashboard/MySourcesDashboard.tsx
 * Purpose: Personal, account-free dashboard with three tabs (bookmarks,
 * ratings, comparison), JSON export and a lazily generated PDF comparison
 * that falls back to the browser print dialog.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bookmark,
  Check,
  Download,
  FileJson,
  FileText,
  HelpCircle,
  Loader2,
  RotateCw,
  Scale,
  Star,
} from "lucide-react";
import type { SourceRecord } from "@/lib/types";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";
import { FirstTimeBanner } from "@/components/phase4/FirstTimeBanner";
import { BookmarkList, RatingList } from "@/components/phase4/dashboard/SavedSourceList";
import { ComparisonTable } from "@/components/phase4/dashboard/ComparisonTable";
import { DashboardPrintSheet } from "@/components/phase4/dashboard/DashboardPrintSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { downloadJson, exportElementToPdf } from "@/lib/phase4/pdf-export";
import { cn, formatNumber } from "@/lib/utils";

type Tab = "bookmarks" | "ratings" | "compare";

interface TabMeta {
  id: Tab;
  label: string;
  icon: typeof Bookmark;
}

const TABS: TabMeta[] = [
  { id: "bookmarks", label: "المفضلة", icon: Bookmark },
  { id: "ratings", label: "تقييماتي", icon: Star },
  { id: "compare", label: "المقارنة", icon: Scale },
];

export function MySourcesDashboard() {
  const {
    ready,
    storageAvailable,
    storageError,
    bookmarks,
    ratings,
    compareList,
    removeRating,
    clearCompare,
    toggleCompare,
    notify,
  } = useBookmarks();

  const [tab, setTab] = useState<Tab>("bookmarks");
  const [sourceMap, setSourceMap] = useState<Record<number, SourceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const allIds = useMemo(() => {
    const ids = new Set<number>();
    bookmarks.forEach((id) => ids.add(id));
    compareList.forEach((id) => ids.add(id));
    Object.keys(ratings).forEach((key) => {
      const id = Number(key);
      if (Number.isInteger(id) && id > 0) ids.add(id);
    });
    return Array.from(ids);
  }, [bookmarks, compareList, ratings]);

  const idsKey = allIds.join(",");

  const loadSources = useCallback(async () => {
    if (allIds.length === 0) {
      setSourceMap({});
      setLoading(false);
      setLoadError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/sources/batch?ids=${encodeURIComponent(idsKey)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const payload = (await response.json()) as {
        sources?: SourceRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر تحميل المصادر. جرّب مرة أخرى.");
      }
      const next: Record<number, SourceRecord> = {};
      for (const source of payload.sources ?? []) next[source.id] = source;
      setSourceMap(next);
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      setLoadError(
        cause instanceof Error
          ? cause.message
          : "تعذر تحميل المصادر. جرّب مرة أخرى.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    if (!ready) return;
    void loadSources();
  }, [ready, loadSources]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const bookmarkedSources = useMemo(
    () => bookmarks.map((id) => sourceMap[id]).filter((source): source is SourceRecord => Boolean(source)),
    [bookmarks, sourceMap],
  );
  const comparedSources = useMemo(
    () => compareList.map((id) => sourceMap[id]).filter((source): source is SourceRecord => Boolean(source)),
    [compareList, sourceMap],
  );
  const ratedSources = useMemo(
    () =>
      Object.keys(ratings)
        .map((key) => sourceMap[Number(key)])
        .filter((source): source is SourceRecord => Boolean(source)),
    [ratings, sourceMap],
  );

  const missingBookmarks = bookmarks.length - bookmarkedSources.length;
  const missingCompared = compareList.length - comparedSources.length;
  const missingRated = Object.keys(ratings).length - ratedSources.length;

  const counts: Record<Tab, number> = {
    bookmarks: bookmarks.length,
    ratings: Object.keys(ratings).length,
    compare: compareList.length,
  };

  async function handlePdf() {
    if (comparedSources.length === 0) {
      notify("أضف مصدراً واحداً على الأقل إلى المقارنة أولاً.");
      return;
    }
    if (!sheetRef.current) return;

    setExporting("pdf");
    try {
      const result = await exportElementToPdf(
        sheetRef.current,
        "مقارنة-المصادر-التونسية",
      );
      if (!result.ok) {
        notify(result.error ?? "تعذر إنشاء ملف PDF. جرّب الطباعة.");
        window.print();
      } else {
        notify("تم إنشاء ملف PDF بنجاح.");
      }
    } finally {
      setExporting(null);
    }
  }

  function handleJson() {
    setExporting("json");
    try {
      const result = downloadJson(
        {
          exportedAt: new Date().toISOString(),
          bookmarks: bookmarks.map((id) => {
            const source = sourceMap[id];
            return source
              ? {
                  id: source.id,
                  name: source.name,
                  url: source.url,
                  system: source.category_system,
                  task: source.category_task,
                  language: source.language,
                  linkStatus: source.link_status,
                }
              : { id };
          }),
          ratings,
          compareList,
          note: "نسخة محلية من بوابة مصادر السيارات التونسية. لا تحتوي بيانات حساب.",
        },
        "بياناتي-مصادر-السيارات",
      );
      notify(
        result.ok
          ? "تم تنزيل نسخة JSON من بياناتك المحلية."
          : (result.error ?? "تعذر إنشاء ملف JSON."),
      );
    } finally {
      setExporting(null);
    }
  }

  if (!ready) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="جارٍ تحميل بياناتك المحلية">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
          <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
        </div>
      </div>
    );
  }

  const totalSaved = bookmarks.length + Object.keys(ratings).length + compareList.length;

  return (
    <div className="dashboard-shell space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-400">
            مساحتي الشخصية
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            مصادرك وتقييماتك
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-6 text-muted">
            كل شيء هنا محفوظ في هذا المتصفح فقط، بدون حساب ولا بريد.{" "}
            {totalSaved > 0
              ? `لديك ${formatNumber(bookmarks.length)} مفضلة و${formatNumber(
                  Object.keys(ratings).length,
                )} تقييماً و${formatNumber(compareList.length)} في المقارنة.`
              : "ابدأ بحفظ مصدر أو تقييمه لتظهر بياناتك هنا."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handlePdf()}
            disabled={
              exporting !== null || loading || !ready || comparedSources.length === 0
            }
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            )}
            تصدير المقارنة PDF
          </button>
          <button
            type="button"
            onClick={handleJson}
            disabled={exporting !== null || loading || !ready || totalSaved === 0}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white disabled:opacity-50"
          >
            {exporting === "json" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FileJson className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            )}
            نسخة JSON
          </button>
        </div>
      </div>

      {!storageAvailable ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] p-3 text-[11px] leading-6 text-amber-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          {storageError ??
            "المتصفح في وضع التصفح الخاص. بعض الميزات غير متاحة. استخدم متصفح عادي."}
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-[11px] text-danger"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span className="min-w-0 flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => void loadSources()}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-danger/30 px-2.5 font-bold"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <FirstTimeBanner guide="dashboard" title="بياناتك تبقى على هذا الجهاز">
        المفضلة والتقييمات والمقارنة تُخزَّن محلياً في متصفحك. لا نطلب حساباً،
        ولا نرسل هذه القوائم إلى الخادم. استعمل «نسخة JSON» للاحتفاظ بنسخة
        احتياطية قبل تنظيف بيانات المتصفح.
      </FirstTimeBanner>

      <div
        role="tablist"
        aria-label="أقسام المساحة الشخصية"
        className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-surface-sunken/60 p-1.5"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold transition-colors sm:text-xs",
                active
                  ? "bg-accent text-background shadow-accent-glow"
                  : "text-muted-strong hover:bg-surface hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-extrabold",
                  active ? "bg-background/20 text-background" : "bg-surface-raised text-muted",
                )}
              >
                {formatNumber(counts[item.id])}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={TABS.find((item) => item.id === tab)?.label}>
        {loading ? (
          <div className="surface-card flex items-center gap-2 p-4 text-[11px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
            جارٍ تحميل بيانات المصادر…
          </div>
        ) : null}

        {!loading && tab === "bookmarks" ? (
          bookmarkedSources.length > 0 ? (
            <BookmarkList
              sources={bookmarkedSources}
              ratings={ratings}
              missingCount={missingBookmarks}
            />
          ) : (
            <EmptyState
              icon={Bookmark}
              title="لا مصادر في المفضلة بعد"
              description="اضغط زر الحفظ على أي مصدر في التشخيص أو التصنيفات أو صفحة المصدر، وسيظهر هنا فوراً."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/sources"
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
                  >
                    تصفّح المصادر
                  </Link>
                  <Link
                    href="/tools/diagnosis"
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
                  >
                    ابدأ تشخيصاً
                  </Link>
                </div>
              }
            />
          )
        ) : null}

        {!loading && tab === "ratings" ? (
          ratedSources.length > 0 ? (
            <RatingList
              sources={ratedSources}
              ratings={ratings}
              onRemoveRating={removeRating}
              missingCount={missingRated}
            />
          ) : (
            <EmptyState
              icon={Star}
              title="لم تُقيّم أي مصدر بعد"
              description="قيّم مصدراً من صفحته أو من نتائج التشخيص. تقييمك يظهر هنا ويمكنك تعديله في أي وقت."
              action={
                <Link
                  href="/sources"
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
                >
                  اختر مصدراً للتقييم
                </Link>
              }
            />
          )
        ) : null}

        {!loading && tab === "compare" ? (
          comparedSources.length > 0 ? (
            <ComparisonTable
              sources={comparedSources}
              ratings={ratings}
              onRemove={(id) => {
                toggleCompare(id);
              }}
              onClear={() => {
                if (window.confirm("هل تريد تفريغ قائمة المقارنة؟")) {
                  clearCompare();
                }
              }}
            />
          ) : (
            <EmptyState
              icon={Scale}
              title="قائمة المقارنة فارغة"
              description="أضف حتى 4 مصادر من البطاقات أو نتائج التشخيص، ثم قارن التخصص واللغة وحالة الرابط وتقييمك. يمكنك تصدير المقارنة كملف PDF."
              action={
                <Link
                  href="/categories"
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
                >
                  ابدأ من التصنيفات
                </Link>
              }
            />
          )
        ) : null}

        {missingCompared > 0 && tab === "compare" ? (
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[10px] leading-6 text-amber-100">
            {formatNumber(missingCompared)} مصدراً في المقارنة لم يعد متوفراً.
            أعد تحميل الصفحة أو أفرغ القائمة ثم أضف مصادر متاحة.
          </p>
        ) : null}
      </div>

      <div className="surface-card p-4 sm:p-5">
        <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
          <HelpCircle className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
          كيف تُحفظ بياناتي؟
        </h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {[
            "المفضلة في مفتاح my-bookmarks داخل متصفحك.",
            "التقييمات في my-ratings، والتقييم الواحد لكل متصفح.",
            "المقارنة في compare-list بحد أقصى 4 مصادر.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[10px] leading-6 text-muted">
              <Check className="mt-1 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleJson}
            disabled={exporting !== null || loading || !ready || totalSaved === 0}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong hover:text-white disabled:opacity-50"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            احتفظ بنسخة
          </button>
          <Link
            href="/how-to-use"
            className="inline-flex min-h-12 items-center gap-1 rounded-lg px-2.5 text-[10px] font-bold text-muted underline underline-offset-4 hover:text-white"
          >
            اقرأ دليل الاستخدام
          </Link>
        </div>
      </div>

      <DashboardPrintSheet
        ref={sheetRef}
        sources={comparedSources}
        ratings={ratings}
      />
    </div>
  );
}
