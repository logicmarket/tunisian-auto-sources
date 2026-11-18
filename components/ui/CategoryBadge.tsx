/**
 * File: components/ui/CategoryBadge.tsx
 * Purpose: Compact, colour-coded pill for system, task, and language values.
 * System badges link to their category page; task/language badges link to a
 * pre-filtered source list.
 */

import Link from "next/link";
import { Globe2, Tag, Wrench } from "lucide-react";
import {
  getSystemMeta,
  languageHref,
  systemHref,
  taskHref,
} from "@/lib/catalog";
import { getLanguageLabel, getTaskLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { SYSTEM_TONE_CLASSES } from "./category-tones";

type BadgeKind = "system" | "task" | "language";

interface CategoryBadgeProps {
  kind: BadgeKind;
  value: string;
  clickable?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const NEUTRAL_CLASS =
  "bg-surface-raised text-muted-strong ring-line hover:border-accent/30";

export function CategoryBadge({
  kind,
  value,
  clickable = true,
  size = "sm",
  className,
}: CategoryBadgeProps) {
  const system = kind === "system" ? getSystemMeta(value) : null;
  const label =
    kind === "system"
      ? system?.label ?? value
      : kind === "task"
        ? getTaskLabel(value)
        : getLanguageLabel(value);

  const href =
    kind === "system"
      ? systemHref(value)
      : kind === "task"
        ? taskHref(value)
        : languageHref(value);

  const Icon = kind === "system" ? Wrench : kind === "task" ? Tag : Globe2;

  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-semibold transition-colors duration-200",
    size === "sm"
      ? "min-h-6 px-2.5 py-1 text-[10px]"
      : "min-h-8 px-3 py-1.5 text-[11px]",
    system ? SYSTEM_TONE_CLASSES[system.tone].badge : NEUTRAL_CLASS,
    clickable && "hover:brightness-125",
    className,
  );

  const content = (
    <>
      {kind === "system" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      ) : (
        <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </>
  );

  if (!clickable) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link
      href={href}
      className={classes}
      title={
        kind === "system"
          ? `فتح تصنيف ${label}`
          : `تصفية المصادر حسب ${label}`
      }
    >
      {content}
    </Link>
  );
}
