/**
 * File: components/ui/SourceCard.tsx
 * Purpose: The primary source card used on the homepage, category pages,
 * search results, and related-source lists. Shows two lines of Arabic
 * description, colour-coded category badges, link health, and a clear
 * "افتح المصدر" action that opens the source in a new tab.
 */

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { SourceRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/phase4/BookmarkButton";
import { CompareButton } from "@/components/phase4/CompareButton";
import { CategoryBadge } from "./CategoryBadge";
import { LinkStatusBadge } from "./LinkStatusBadge";
import { RatingStars } from "./RatingStars";

interface SourceCardProps {
  source: SourceRecord;
  className?: string;
  /** Hide the task/system badges in dense search results. */
  compact?: boolean;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function SourceCard({
  source,
  className,
  compact = false,
}: SourceCardProps) {
  const hostname = getHostname(source.url);
  const detailHref = `/sources/${source.id}`;

  return (
    <article
      className={cn(
        "surface-card group flex h-full flex-col p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-accent-glow",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkStatusBadge status={source.link_status} lastVerified={source.last_verified} />
        <CategoryBadge kind="language" value={source.language} />
      </div>

      <h3 className="mt-4 text-start text-lg font-bold leading-snug text-white transition-colors group-hover:text-accent-300">
        <Link href={detailHref} className="rounded focus-visible:ring-offset-4">
          {source.name}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-2 flex-1 text-start text-sm leading-7 text-muted-strong">
        {source.description_ar}
      </p>

      {compact ? null : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <CategoryBadge kind="system" value={source.category_system} />
          <CategoryBadge kind="task" value={source.category_task} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <RatingStars rating={source.rating} />

        <div className="flex items-center gap-2">
          <BookmarkButton sourceId={source.id} sourceName={source.name} />
          <CompareButton sourceId={source.id} sourceName={source.name} />
          <Link
            href={detailHref}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-3 py-2 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            التفاصيل
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`افتح ${source.name} في تبويب جديد`}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
          >
            افتح المصدر
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {hostname ? (
        <p
          className="mt-2 truncate text-[10px] text-muted/70"
          dir="ltr"
          title={hostname}
        >
          {hostname}
        </p>
      ) : null}
    </article>
  );
}
