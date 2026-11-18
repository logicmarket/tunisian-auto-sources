/**
 * File: components/ui/SectionHeading.tsx
 * Purpose: Reusable section header with an accent eyebrow, Arabic title,
 * optional description, and a trailing action.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
            {eyebrow}
          </p>
        ) : null}
        <h2
          id={id}
          className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
    </div>
  );
}
