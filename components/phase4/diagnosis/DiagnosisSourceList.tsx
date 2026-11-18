"use client";

/**
 * File: components/phase4/diagnosis/DiagnosisSourceList.tsx
 * Purpose: Compact source recommendations inside diagnosis results. Each row
 * exposes the shared bookmark / compare actions and an inline rating widget,
 * so a mechanic can act on a recommendation without leaving the diagnosis.
 */

import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2 } from "lucide-react";
import type { SourceRecord } from "@/lib/types";
import { getLanguageLabel, getSystemLabel } from "@/lib/labels";
import { BookmarkButton } from "@/components/phase4/BookmarkButton";
import { CompareButton } from "@/components/phase4/CompareButton";
import { RatingWidget } from "@/components/phase4/RatingWidget";
import { LinkStatusBadge } from "@/components/ui/LinkStatusBadge";
import { cn } from "@/lib/utils";

interface DiagnosisSourceListProps {
  sources: SourceRecord[];
  title?: string;
  className?: string;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function DiagnosisSourceList({
  sources,
  title = "مصادر مقترحة لهذا الفحص",
  className,
}: DiagnosisSourceListProps) {
  if (sources.length === 0) {
    return (
      <div className={cn("rounded-xl border border-line bg-surface-raised/50 p-4", className)}>
        <p className="text-[11px] leading-6 text-muted">
          لا توجد مصادر مقترحة لهذا النظام حالياً. تصفّح{" "}
          <Link href="/sources" className="font-bold text-accent-300 underline underline-offset-4">
            كل المصادر
          </Link>{" "}
          أو أضف مصدراً جديداً.
        </p>
      </div>
    );
  }

  return (
    <section className={cn("space-y-3", className)} aria-label={title}>
      <h4 className="text-xs font-extrabold text-white">{title}</h4>

      <ul className="space-y-3">
        {sources.map((source) => (
          <li
            key={source.id}
            className="rounded-xl border border-line bg-surface-raised/50 p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/sources/${source.id}`}
                  className="text-sm font-bold text-white transition-colors hover:text-accent-300"
                >
                  {source.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-[11px] leading-6 text-muted">
                  {source.description_ar}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <LinkStatusBadge status={source.link_status} />
                  <span className="chip">
                    <Globe2 className="h-3 w-3 text-accent-400" aria-hidden="true" />
                    {getLanguageLabel(source.language)}
                  </span>
                  <span className="chip">{getSystemLabel(source.category_system)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <BookmarkButton sourceId={source.id} sourceName={source.name} />
                <CompareButton sourceId={source.id} sourceName={source.name} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
              <p className="truncate text-[10px] text-muted/70" dir="ltr" title={hostname(source.url)}>
                {hostname(source.url)}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/sources/${source.id}`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-muted-strong transition-colors hover:text-white"
                >
                  التفاصيل
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                </Link>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 text-[10px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
                >
                  افتح
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>

            <RatingWidget
              sourceId={source.id}
              sourceName={source.name}
              variant="compact"
              className="mt-3 border-line/70 bg-surface/60 p-3"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
