"use client";

/**
 * File: components/phase4/dashboard/ComparisonTable.tsx
 * Purpose: Side-by-side comparison of up to four saved sources, with a
 * mobile card layout, a light A4 print sheet used for PDF export, and an
 * explicit note that ratings are editorial/community, not a purchase score.
 */

import Link from "next/link";
import { ArrowLeft, ExternalLink, Scale, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { RatingMap, SourceRecord } from "@/lib/types";
import { getLanguageLabel, getSystemLabel, getTaskLabel } from "@/lib/labels";
import { LinkStatusBadge } from "@/components/ui/LinkStatusBadge";
import { RatingStars } from "@/components/ui/RatingStars";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  sources: SourceRecord[];
  ratings: RatingMap;
  onRemove: (id: number) => void;
  onClear: () => void;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-line/60 py-2.5 last:border-b-0">
      <dt className="text-[10px] font-bold text-muted">{label}</dt>
      <dd className="min-w-0 text-[11px] leading-6 text-muted-strong">{children}</dd>
    </div>
  );
}

export function ComparisonTable({
  sources,
  ratings,
  onRemove,
  onClear,
}: ComparisonTableProps) {
  /*
   * Best option = highest personal rating, falling back to the editorial
   * rating. Only a unique winner is highlighted; ties stay neutral so the
   * table never invents a preference.
   */
  const scores = sources.map((source) => ({
    id: source.id,
    score: ratings[String(source.id)]?.stars ?? source.rating,
  }));
  const maxScore = scores.length > 1 ? Math.max(...scores.map((entry) => entry.score)) : 0;
  const leaders = scores.filter((entry) => entry.score === maxScore);
  const bestId = leaders.length === 1 ? leaders[0].id : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
            <Scale className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            مقارنة المصادر
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            حتى 4 مصادر · قارن التخصص واللغة وحالة الرابط وتقييمك الشخصي.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong transition-colors hover:border-danger/40 hover:text-danger"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          تفريغ المقارنة
        </button>
      </div>

      {/* Mobile: stacked cards. Desktop: comparison table. */}
      <div className="grid gap-3 md:hidden">
        {sources.map((source) => {
          const mine = ratings[String(source.id)];
          const isBest = source.id === bestId;
          return (
            <article
              key={source.id}
              className={cn(
                "surface-card p-4",
                isBest && "border-accent/40 bg-accent/[0.04]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/sources/${source.id}`}
                    className="text-sm font-extrabold text-white hover:text-accent-300"
                  >
                    {source.name}
                  </Link>
                  {isBest ? (
                    <span className="ms-2 inline-flex rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-accent-200">
                      الأفضل
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(source.id)}
                  aria-label={`إزالة ${source.name} من المقارنة`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <dl className="mt-2">
                <Row label="الوصف">
                  <span className="line-clamp-3">{source.description_ar}</span>
                </Row>
                <Row label="النظام">
                  <span className="chip">{getSystemLabel(source.category_system)}</span>
                </Row>
                <Row label="المهمة">{getTaskLabel(source.category_task)}</Row>
                <Row label="اللغة">{getLanguageLabel(source.language)}</Row>
                <Row label="الرابط">
                  <LinkStatusBadge status={source.link_status} />
                </Row>
                <Row label="التقييم التحريري">
                  <RatingStars rating={source.rating} />
                </Row>
                <Row label="تقييمي">
                  {mine ? (
                    <RatingStars rating={mine.stars} />
                  ) : (
                    <span className="text-muted">لم تُقيّم بعد</span>
                  )}
                </Row>
              </dl>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/sources/${source.id}`}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-surface-raised text-[10px] font-bold text-muted-strong hover:text-white"
                >
                  التفاصيل
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                </Link>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent/10 text-[10px] font-bold text-accent-200 hover:bg-accent hover:text-background"
                >
                  افتح
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="surface-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-start">
            <caption className="sr-only">مقارنة المصادر المحفوظة</caption>
            <thead>
              <tr className="border-b border-line bg-surface-raised/60">
                <th scope="col" className="w-28 px-3 py-3 text-start text-[10px] font-bold text-muted">
                  المعيار
                </th>
                {sources.map((source) => (
                  <th
                    key={source.id}
                    scope="col"
                    className={cn(
                      "min-w-44 px-3 py-3 text-start",
                      source.id === bestId && "bg-accent/[0.06]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <Link
                          href={`/sources/${source.id}`}
                          className="text-xs font-extrabold leading-5 text-white hover:text-accent-300"
                        >
                          {source.name}
                        </Link>
                        {source.id === bestId ? (
                          <span className="mt-1 block w-fit rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-accent-200">
                            الأفضل
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(source.id)}
                        aria-label={`إزالة ${source.name} من المقارنة`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">الوصف</th>
                {sources.map((source) => (
                  <td
                    key={source.id}
                    className={cn(
                      "px-3 py-2.5 text-[11px] leading-6 text-muted-strong",
                      source.id === bestId && "bg-accent/[0.04]",
                    )}
                  >
                    <span className="line-clamp-3">{source.description_ar}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">النظام</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5">
                    <span className="chip">{getSystemLabel(source.category_system)}</span>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">المهمة</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5 text-[11px] text-muted-strong">
                    {getTaskLabel(source.category_task)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">اللغة</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5 text-[11px] text-muted-strong">
                    {getLanguageLabel(source.language)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">حالة الرابط</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5">
                    <LinkStatusBadge status={source.link_status} />
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">التقييم التحريري</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5">
                    <RatingStars rating={source.rating} />
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">تقييمي</th>
                {sources.map((source) => {
                  const mine = ratings[String(source.id)];
                  return (
                    <td key={source.id} className="px-3 py-2.5">
                      {mine ? (
                        <RatingStars rating={mine.stars} />
                      ) : (
                        <span className="text-[10px] text-muted">لم يُقيَّم</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="px-3 py-2.5 text-start text-[10px] font-bold text-muted">روابط</th>
                {sources.map((source) => (
                  <td key={source.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/sources/${source.id}`}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-line px-2 text-[10px] font-bold text-muted-strong hover:text-white"
                      >
                        التفاصيل
                      </Link>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 text-[10px] font-bold text-accent-200 hover:bg-accent hover:text-background"
                      >
                        افتح
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] leading-6 text-muted/80">
        التقييم التحريري يعكس جودة المصدر حسب مراجعتنا، وتقييمك الشخصي محفوظ على
        هذا المتصفح فقط. لا نعرض متوسط تقييمات الزوار قبل جمع 3 تقييمات على الأقل.
      </p>

    </div>
  );
}
