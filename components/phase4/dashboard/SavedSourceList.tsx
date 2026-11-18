"use client";

/**
 * File: components/phase4/dashboard/SavedSourceList.tsx
 * Purpose: Bookmark and rating tabs of the personal dashboard. Both read the
 * same provider and batch-loaded source records; missing records are reported
 * instead of silently disappearing.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Globe2,
  MessageSquare,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import type { RatingMap, SourceRecord } from "@/lib/types";
import { getLanguageLabel, getSystemLabel, getTaskLabel } from "@/lib/labels";
import { LinkStatusBadge } from "@/components/ui/LinkStatusBadge";
import { RatingStars } from "@/components/ui/RatingStars";
import { BookmarkButton } from "@/components/phase4/BookmarkButton";
import { CompareButton } from "@/components/phase4/CompareButton";
import { formatArabicDate, formatNumber } from "@/lib/utils";

interface BookmarkListProps {
  sources: SourceRecord[];
  ratings: RatingMap;
  missingCount: number;
}

type BookmarkSort = "saved" | "rating" | "category";

const SORT_OPTIONS: Array<{ id: BookmarkSort; label: string }> = [
  { id: "saved", label: "حسب الحفظ" },
  { id: "rating", label: "الأعلى تقييماً" },
  { id: "category", label: "حسب التصنيف" },
];

export function BookmarkList({ sources, ratings, missingCount }: BookmarkListProps) {
  const [sort, setSort] = useState<BookmarkSort>("saved");

  /*
   * `sources` arrives in `my-bookmarks` order, i.e. save order. "saved" shows
   * the newest save first without adding a second timestamp to localStorage.
   * Ties fall back to the Arabic name so the order is stable.
   */
  const ordered = (() => {
    const list = [...sources];
    if (sort === "saved") return list.reverse();
    if (sort === "rating") {
      return list.sort(
        (a, b) =>
          b.rating - a.rating || a.name.localeCompare(b.name, "ar"),
      );
    }
    return list.sort(
      (a, b) =>
        a.category_system.localeCompare(b.category_system) ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name, "ar"),
    );
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
            <Bookmark className="h-4 w-4 text-accent-400" aria-hidden="true" />
            المصادر المحفوظة
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            {formatNumber(sources.length)} مصدراً محفوظاً على هذا المتصفح.
          </p>
        </div>
        <Link
          href="/sources"
          className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-3 text-[10px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
        >
          تصفّح المزيد
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div
        role="group"
        aria-label="ترتيب المصادر المحفوظة"
        className="flex flex-wrap gap-1.5"
      >
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSort(option.id)}
            aria-pressed={sort === option.id}
            className={
              sort === option.id
                ? "inline-flex min-h-12 items-center rounded-lg border border-accent bg-accent px-3 text-[10px] font-bold text-background"
                : "inline-flex min-h-12 items-center rounded-lg border border-line bg-surface px-3 text-[10px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ordered.map((source) => {
          const mine = ratings[String(source.id)];
          return (
            <article key={source.id} className="surface-card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/sources/${source.id}`}
                    className="text-sm font-extrabold leading-6 text-white transition-colors hover:text-accent-300"
                  >
                    {source.name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-6 text-muted">
                    {source.description_ar}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <BookmarkButton sourceId={source.id} sourceName={source.name} />
                  <CompareButton sourceId={source.id} sourceName={source.name} />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <LinkStatusBadge status={source.link_status} />
                <span className="chip">{getSystemLabel(source.category_system)}</span>
                <span className="chip">
                  <Globe2 className="h-3 w-3 text-accent-400" aria-hidden="true" />
                  {getLanguageLabel(source.language)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <div className="space-y-1">
                  <RatingStars rating={source.rating} />
                  <p className="text-[10px] text-muted">
                    {mine ? `تقييمي: ${mine.stars} من 5` : "لم تُقيّم هذا المصدر"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/sources/${source.id}`}
                    className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong hover:text-white"
                  >
                    التفاصيل
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 text-[10px] font-bold text-accent-200 hover:bg-accent hover:text-background"
                  >
                    افتح
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {missingCount > 0 ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[10px] leading-6 text-amber-100">
          {formatNumber(missingCount)} مصدراً محفوظاً لم يعد متوفراً في القاعدة
          (ربما حُذف أو دُمج). يمكنك إزالته من المفضلة عبر زر الحفظ في أي بطاقة،
          أو تفريغ القائمة من الإعدادات أدناه.
        </p>
      ) : null}
    </div>
  );
}

interface RatingListProps {
  sources: SourceRecord[];
  ratings: RatingMap;
  onRemoveRating: (sourceId: number) => void;
  missingCount: number;
}

export function RatingList({
  sources,
  ratings,
  onRemoveRating,
  missingCount,
}: RatingListProps) {
  const ordered = [...sources].sort((a, b) => {
    const dateA = ratings[String(a.id)]?.date ?? "";
    const dateB = ratings[String(b.id)]?.date ?? "";
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="space-y-3">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
          <Star className="h-4 w-4 text-accent-400" aria-hidden="true" />
          تقييماتي
        </h2>
        <p className="mt-0.5 text-[10px] text-muted">
          {formatNumber(sources.length)} تقييماً محفوظاً · يمكنك تعديل أي تقييم من
          صفحة المصدر.
        </p>
      </div>

      <ul className="space-y-2.5">
        {ordered.map((source) => {
          const mine = ratings[String(source.id)];
          if (!mine) return null;

          return (
            <li
              key={source.id}
              className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/sources/${source.id}`}
                    className="text-sm font-extrabold text-white transition-colors hover:text-accent-300"
                  >
                    {source.name}
                  </Link>
                  <RatingStars rating={mine.stars} />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{getSystemLabel(source.category_system)}</span>
                  <span className="chip">{getTaskLabel(source.category_task)}</span>
                  <span className="text-[10px] text-muted">
                    {formatArabicDate(mine.date)}
                  </span>
                </div>

                {mine.comment ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-line bg-surface-raised/50 p-2.5 text-[11px] leading-6 text-muted-strong">
                    <MessageSquare className="mt-1 h-3 w-3 shrink-0 text-accent-400" aria-hidden="true" />
                    {mine.comment}
                  </p>
                ) : null}

                {mine.helpful !== undefined ? (
                  <p className="mt-1.5 text-[10px] text-muted">
                    صوّتت: {mine.helpful ? "المصدر مفيد" : "المصدر غير مفيد"}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/sources/${source.id}#rate`}
                  className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  تعديل
                </Link>
                <button
                  type="button"
                  onClick={() => onRemoveRating(source.id)}
                  aria-label={`حذف تقييمي لـ ${source.name}`}
                  className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  حذف
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {missingCount > 0 ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[10px] leading-6 text-amber-100">
          {formatNumber(missingCount)} تقييماً يشير إلى مصادر لم تعد متاحة. يمكنك
          حذفها من هذه القائمة.
        </p>
      ) : null}
    </div>
  );
}
