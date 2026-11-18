/**
 * File: components/ui/EmptyState.tsx
 * Purpose: Friendly, actionable empty state used when filters return no
 * sources or a search has no matches.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-extrabold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
