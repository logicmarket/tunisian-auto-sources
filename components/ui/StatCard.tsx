import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "surface-card p-4 sm:p-5",
        highlight && "border-accent/25 bg-accent/[0.06]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted sm:text-xs">
          {label}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised text-muted-strong",
            highlight && "bg-accent/15 text-accent-300",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl",
          highlight ? "text-accent-300" : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}
