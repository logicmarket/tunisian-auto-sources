"use client";

/**
 * File: components/phase4/CompareButton.tsx
 * Purpose: Reusable "add to comparison" control shared by cards, the source
 * detail page and diagnosis results. Enforces the 4-source limit.
 */

import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";

interface CompareButtonProps {
  sourceId: number;
  sourceName?: string;
  showLabel?: boolean;
  className?: string;
}

export function CompareButton({
  sourceId,
  sourceName,
  showLabel = false,
  className,
}: CompareButtonProps) {
  const { ready, isCompared, toggleCompare } = useBookmarks();
  const active = isCompared(sourceId);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => toggleCompare(sourceId, sourceName)}
      aria-pressed={active}
      aria-label={
        active
          ? `إزالة ${sourceName ?? "المصدر"} من المقارنة`
          : `إضافة ${sourceName ?? "المصدر"} إلى المقارنة`
      }
      title={active ? "إزالة من المقارنة" : "أضف إلى المقارنة"}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all duration-200 disabled:opacity-50",
        showLabel ? "px-3" : "h-12 min-w-12 w-12",
        active
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-line bg-surface-raised text-muted-strong hover:border-emerald-400/40 hover:text-emerald-300",
        className,
      )}
    >
      <Scale className="h-4 w-4" aria-hidden="true" />
      {showLabel ? <span>{active ? "في المقارنة" : "قارن"}</span> : null}
    </button>
  );
}
