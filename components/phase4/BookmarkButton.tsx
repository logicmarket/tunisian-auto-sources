"use client";

/**
 * File: components/phase4/BookmarkButton.tsx
 * Purpose: Reusable ☆/★ toggle for source cards, diagnosis results and the
 * source detail page. Writes to the shared BookmarksProvider.
 */

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";

interface BookmarkButtonProps {
  sourceId: number;
  sourceName?: string;
  showLabel?: boolean;
  className?: string;
}

export function BookmarkButton({
  sourceId,
  sourceName,
  showLabel = false,
  className,
}: BookmarkButtonProps) {
  const { ready, isBookmarked, toggleBookmark } = useBookmarks();
  const active = isBookmarked(sourceId);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => toggleBookmark(sourceId, sourceName)}
      aria-pressed={active}
      aria-label={
        active
          ? `إزالة ${sourceName ?? "المصدر"} من المفضلة`
          : `حفظ ${sourceName ?? "المصدر"} في المفضلة`
      }
      title={active ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all duration-200 disabled:opacity-50",
        showLabel ? "px-3" : "h-12 min-w-12 w-12",
        active
          ? "border-accent/50 bg-accent/15 text-accent-200"
          : "border-line bg-surface-raised text-muted-strong hover:border-accent/40 hover:text-white",
        className,
      )}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          active && "fill-accent text-accent",
        )}
        aria-hidden="true"
      />
      {showLabel ? <span>{active ? "محفوظ" : "احفظ"}</span> : null}
    </button>
  );
}
