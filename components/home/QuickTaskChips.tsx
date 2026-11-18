/**
 * File: components/home/QuickTaskChips.tsx
 * Purpose: Horizontally scrollable task chips for the homepage. The scroll
 * container is deliberately full-bleed on phones, with snap points so each
 * chip is easy to hit with a thumb.
 */

import Link from "next/link";
import { QUICK_TASKS } from "@/lib/catalog";
import type { CategoryCount } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { CatalogIcon } from "@/components/ui/CatalogIcon";

interface QuickTaskChipsProps {
  counts: CategoryCount[];
  className?: string;
}

export function QuickTaskChips({ counts, className }: QuickTaskChipsProps) {
  const countMap = new Map(counts.map((entry) => [entry.value, entry.count]));

  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0",
        "[&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex min-w-max snap-x snap-mandatory gap-2">
        {QUICK_TASKS.map((task) => {
          const count = countMap.get(task.value) ?? 0;
          return (
            <Link
              key={task.value}
              href={`/sources?task=${task.slug}`}
              className="group inline-flex min-h-12 snap-start items-center gap-2 rounded-xl border border-line bg-surface/90 px-3.5 py-2 text-xs font-bold text-muted-strong transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-accent-300 transition-colors group-hover:bg-accent group-hover:text-background">
                <CatalogIcon name={task.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="whitespace-nowrap">{task.quickLabel}</span>
              <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-muted">
                {formatNumber(count)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
