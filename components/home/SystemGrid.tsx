/**
 * File: components/home/SystemGrid.tsx
 * Purpose: The ten-system quick browser on the homepage. Every tile shows
 * an Arabic system name, a colour-coded icon, and the live source count.
 * Counts come from SQLite; systems with no published sources stay visible
 * so the taxonomy feels complete (and tells the truth about coverage).
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SYSTEM_META, sourceCountLabel } from "@/lib/catalog";
import type { CategoryCount } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { CatalogIcon } from "@/components/ui/CatalogIcon";
import { SYSTEM_TONE_CLASSES } from "@/components/ui/category-tones";

interface SystemGridProps {
  counts: CategoryCount[];
  className?: string;
}

export function SystemGrid({ counts, className }: SystemGridProps) {
  const countMap = new Map(counts.map((entry) => [entry.value, entry.count]));

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {SYSTEM_META.map((system, index) => {
        const count = countMap.get(system.value) ?? 0;
        const tone = SYSTEM_TONE_CLASSES[system.tone];
        const hasSources = count > 0;

        return (
          <Link
            key={system.value}
            href={`/categories/${system.slug}`}
            style={{ animationDelay: `${index * 35}ms` }}
            className={cn(
              "surface-card group relative flex animate-fade-up flex-col p-4 transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-accent-glow",
              tone.cardHover,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                  tone.icon,
                )}
              >
                <CatalogIcon name={system.icon} className="h-5 w-5" />
              </span>

              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums ring-1 ring-inset",
                  hasSources
                    ? tone.badge
                    : "bg-surface-raised text-muted ring-line",
                )}
              >
                {formatNumber(count)}
              </span>
            </div>

            <h3 className="mt-3.5 text-start text-sm font-extrabold leading-snug text-white transition-colors group-hover:text-accent-200">
              {system.label}
            </h3>
            <p className="mt-1 text-start text-[10px] leading-5 text-muted">
              {sourceCountLabel(count)}
            </p>

            <span className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-bold text-muted/70 transition-colors group-hover:text-accent-300">
              تصفّح
              <ArrowLeft
                className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
