/**
 * File: components/phase4/ui/SeverityBadge.tsx
 * Purpose: Arabic, colour-coded OBD severity badge used by diagnosis results.
 */

import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_META: Record<
  string,
  { label: string; tone: string; icon: typeof AlertTriangle }
> = {
  Critical: {
    label: "حرج",
    tone: "border-danger/40 bg-danger/10 text-danger",
    icon: ShieldAlert,
  },
  High: {
    label: "مرتفع",
    tone: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    icon: AlertTriangle,
  },
  Medium: {
    label: "متوسط",
    tone: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    icon: Info,
  },
  Low: {
    label: "منخفض",
    tone: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
    icon: ShieldCheck,
  },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: string | null | undefined;
  className?: string;
}) {
  const meta = SEVERITY_META[severity ?? "Medium"] ?? SEVERITY_META.Medium;
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold",
        meta.tone,
        className,
      )}
      aria-label={`درجة الخطورة: ${meta.label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const CONFIDENCE_META: Record<
  string,
  { label: string; tone: string; description: string }
> = {
  high: {
    label: "احتمال مرتفع",
    tone: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    description: "تطابق قوي بين الأعراض وعائلة الكود.",
  },
  medium: {
    label: "احتمال متوسط",
    tone: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    description: "تطابق جزئي يستحق الفحص.",
  },
  low: {
    label: "احتمال منخفض",
    tone: "border-line bg-surface-raised text-muted-strong",
    description: "احتمال أقل؛ افحصه بعد الاحتمالات الأعلى.",
  },
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: string;
  className?: string;
}) {
  const meta = CONFIDENCE_META[confidence] ?? CONFIDENCE_META.low;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold",
        meta.tone,
        className,
      )}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

export function ApproximateBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/[0.07] px-2.5 py-1 text-[10px] font-bold text-amber-200",
        className,
      )}
      title="الربط بين الأعراض والأكواد تقديري مبني على عائلات OBD الموثقة، وليس تشخيصاً نهائياً."
    >
      <Info className="h-3 w-3" aria-hidden="true" />
      تقدير تقريبي (APPROXIMATE)
    </span>
  );
}
