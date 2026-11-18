/**
 * File: components/home/ObdQuickList.tsx
 * Purpose: The ten most-searched OBD-II trouble codes, shown as compact
 * two-column tiles. Codes are the only Latin text on the tile; every label
 * around them stays Arabic.
 */

import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { getObdCategoryLabel } from "@/lib/labels";
import type { ObdCodeRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ObdQuickListProps {
  codes: ObdCodeRecord[];
  className?: string;
}

export function ObdQuickList({ codes, className }: ObdQuickListProps) {
  if (codes.length === 0) return null;

  return (
    <div
      className={cn(
        "grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2",
        className,
      )}
    >
      {codes.map((code) => (
        <Link
          key={code.code}
          href={`/obd-codes/${code.code}`}
          className="surface-card group flex min-w-0 items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-accent-glow"
        >
          <span className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.07] text-accent-300">
            <ScanLine className="h-3 w-3 opacity-70" aria-hidden="true" />
            <span
              className="font-mono text-[11px] font-extrabold tracking-tight"
              dir="ltr"
            >
              {code.code}
            </span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-start text-xs font-bold text-white transition-colors group-hover:text-accent-200">
              {code.name_ar ?? "كود عطل مسجّل"}
            </span>
            <span className="mt-0.5 block truncate text-start text-[10px] text-muted">
              {code.system_category ?? getObdCategoryLabel(code.category)}
            </span>
          </span>

          <ArrowLeft
            className="h-3.5 w-3.5 shrink-0 text-muted/50 transition-all group-hover:-translate-x-0.5 group-hover:text-accent-300"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
