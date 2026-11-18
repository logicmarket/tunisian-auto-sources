/**
 * File: components/ui/LinkStatusBadge.tsx
 * Purpose: Consistent link-health indicator with icon, label and tooltip.
 * Phase 5 · Task 3 adds the last-verification date and a stale marker so the
 * public catalogue exposes *when* a link was last checked, not just a colour.
 */

import {
  AlertTriangle,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import { getLinkStatusMeta, linkStatusToneClasses } from "@/lib/labels";
import type { LinkStatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<LinkStatusTone, LucideIcon> = {
  success: CircleCheck,
  warning: AlertTriangle,
  neutral: CircleHelp,
  danger: CircleX,
};

/** A link verified more than this many days ago gets a small clock marker. */
const STALE_AFTER_DAYS = 14;

function daysSince(value: string): number | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
}

function formatVerifiedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-TN-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

interface LinkStatusBadgeProps {
  status: string;
  className?: string;
  showLabel?: boolean;
  /** Calendar date (YYYY-MM-DD) or ISO timestamp from sources.last_verified. */
  lastVerified?: string | null;
  /** Latest HTTP status from link_reports, when the card has it. */
  httpStatus?: number | null;
}

export function LinkStatusBadge({
  status,
  className,
  showLabel = true,
  lastVerified,
  httpStatus,
}: LinkStatusBadgeProps) {
  const meta = getLinkStatusMeta(status);
  const Icon = STATUS_ICONS[meta.tone];
  const age = lastVerified ? daysSince(lastVerified) : null;
  const stale = age !== null && age > STALE_AFTER_DAYS;

  const details = [
    `حالة الرابط: ${meta.label}`,
    lastVerified ? `آخر تحقق: ${formatVerifiedDate(lastVerified)}` : "لم يُتحقق منه بعد",
    typeof httpStatus === "number" ? `HTTP ${httpStatus}` : null,
    stale ? "يحتاج إعادة تحقق" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset",
        linkStatusToneClasses[meta.tone],
        className,
      )}
      title={details}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {showLabel ? meta.label : <span className="sr-only">{meta.label}</span>}
      {stale ? (
        <Clock3
          className="h-3 w-3 text-amber-300"
          aria-label="آخر تحقق قديم"
        />
      ) : null}
    </span>
  );
}
