"use client";

/**
 * File: components/phase4/diagnosis/SymptomPicker.tsx
 * Purpose: Path B — pick 1 to 5 observable symptoms across eight systems,
 * optionally add a documented brand, then run the conservative matcher.
 */

import { useMemo, useState } from "react";
import {
  Check,
  Cog,
  Disc3,
  Fuel,
  Gauge,
  GitBranch,
  Loader2,
  Shield,
  Sparkles,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import type { SymptomRecord, SymptomSystemId } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export interface SymptomSystemGroup {
  id: SymptomSystemId;
  name_ar: string;
  name_en: string;
  description: string;
  icon: string;
  tone: string;
  symptoms: SymptomRecord[];
}

interface SymptomPickerProps {
  systems: SymptomSystemGroup[];
  brands: readonly string[];
  selected: string[];
  brand: string;
  onToggle: (symptomId: string) => void;
  onBrandChange: (brand: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onSelectKnown?: (symptomId: string) => void;
  busy?: boolean;
  maxSymptoms?: number;
}

const ICONS: Record<string, typeof Cog> = {
  cog: Cog,
  zap: Zap,
  disc: Disc3,
  thermometer: Thermometer,
  "git-branch": GitBranch,
  fuel: Fuel,
  gauge: Gauge,
  shield: Shield,
};

export function SymptomPicker({
  systems,
  brands,
  selected,
  brand,
  onToggle,
  onBrandChange,
  onClear,
  onSubmit,
  busy = false,
  maxSymptoms = 5,
}: SymptomPickerProps) {
  const [activeSystem, setActiveSystem] = useState<SymptomSystemId>(
    systems[0]?.id ?? "engine",
  );

  const active = systems.find((system) => system.id === activeSystem) ?? systems[0];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const reachedLimit = selected.length >= maxSymptoms;

  const selectedSymptoms = useMemo(() => {
    const map = new Map<string, SymptomRecord>();
    for (const system of systems) {
      for (const symptom of system.symptoms) map.set(symptom.id, symptom);
    }
    return selected.map((id) => map.get(id)).filter((item): item is SymptomRecord => Boolean(item));
  }, [selected, systems]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-white">
            اختر الأعراض التي تلاحظها
          </label>
          <span
            className={cn(
              "text-[10px] font-bold",
              reachedLimit ? "text-amber-300" : "text-muted",
            )}
          >
            {formatNumber(selected.length)} / {maxSymptoms} أعراض
          </span>
        </div>

        <div className="mt-2 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-raised/60 p-2">
          {selectedSymptoms.length === 0 ? (
            <p className="px-1 text-[11px] text-muted">
              لم تختر أعراضاً بعد. ابدأ من أحد الأنظمة أدناه.
            </p>
          ) : (
            selectedSymptoms.map((symptom) => (
              <button
                key={symptom.id}
                type="button"
                onClick={() => onToggle(symptom.id)}
                aria-label={`إزالة العرض: ${symptom.name_ar}`}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
              >
                {symptom.name_ar}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          الأنظمة
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {systems.map((system) => {
            const Icon = ICONS[system.icon] ?? Cog;
            const count = system.symptoms.filter((symptom) => selectedSet.has(symptom.id)).length;
            const isActive = system.id === active?.id;

            return (
              <button
                key={system.id}
                type="button"
                onClick={() => setActiveSystem(system.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-start transition-colors",
                  isActive
                    ? "border-accent/50 bg-accent/10 text-white"
                    : "border-line bg-surface-raised text-muted-strong hover:border-accent/30 hover:text-white",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-accent-300" : "text-accent-400/70",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[11px] font-bold">{system.name_ar}</span>
                </span>
                {count > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-background">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {active ? (
        <div className="rounded-xl border border-line bg-surface-raised/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white">
                أعراض {active.name_ar}
              </h3>
              <p className="mt-0.5 text-[10px] leading-5 text-muted">
                {active.description}
              </p>
            </div>
            <span className="chip">
              {formatNumber(active.symptoms.length)} عرضاً
            </span>
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {active.symptoms.map((symptom) => {
              const checked = selectedSet.has(symptom.id);
              const disabled = !checked && reachedLimit;

              return (
                <button
                  key={symptom.id}
                  type="button"
                  onClick={() => onToggle(symptom.id)}
                  aria-pressed={checked}
                  disabled={disabled}
                  className={cn(
                    "flex min-h-12 items-start gap-2 rounded-xl border p-2.5 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                    checked
                      ? "border-accent/45 bg-accent/[0.09]"
                      : "border-line bg-surface hover:border-accent/30",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      checked
                        ? "border-accent bg-accent text-background"
                        : "border-line bg-surface-raised text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[11px] font-bold leading-5",
                        checked ? "text-white" : "text-muted-strong",
                      )}
                    >
                      {symptom.name_ar}
                    </span>
                    <span className="block text-[9px] leading-4 text-muted/70" dir="ltr">
                      {symptom.name_en}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="diagnosis-brand" className="block text-[11px] font-bold text-white">
            نوع السيارة (اختياري)
          </label>
          <p className="mt-0.5 text-[10px] leading-5 text-muted">
            يُستخدم فقط للأكواد الموثقة كخاصة بعلامة معينة. لا نخمّن توافقاً غير موثق.
          </p>
          <select
            id="diagnosis-brand"
            value={brand}
            onChange={(event) => onBrandChange(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold text-white focus:border-accent/50"
          >
            <option value="">بدون تحديد</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={selected.length === 0 || busy}
            className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-raised px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            تفريغ
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={selected.length === 0 || busy}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            اعرض الاحتمالات
          </button>
        </div>
      </div>

      <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[10px] leading-6 text-muted">
        ربط الأعراض بالأكواد تقديري (APPROXIMATE) ومبني على عائلات OBD الموثقة.
        النتيجة اقتراح للفحص وليست تشخيصاً نهائياً — أكّد دائماً بجهاز فحص
        وبدليل الصانع.
      </p>
    </div>
  );
}
