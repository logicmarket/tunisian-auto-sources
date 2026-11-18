"use client";

/**
 * File: components/phase4/diagnosis/DiagnosisTool.tsx
 * Purpose: Client orchestrator for the guided diagnosis tool. Path A is an
 * instant OBD code lookup; Path B matches observable symptoms. Both paths
 * share result rendering, explicit approximate labelling and Arabic errors.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RotateCw,
  ScanLine,
  Stethoscope,
} from "lucide-react";
import type {
  DiagnosisBySymptomResult,
  DiagnosisCodeDetail,
} from "@/lib/types";
import {
  CodeDiagnosisResult,
  SymptomDiagnosisResult,
} from "@/components/phase4/diagnosis/DiagnosisResults";
import { CodeSearch } from "@/components/phase4/diagnosis/CodeSearch";
import {
  SymptomPicker,
  type SymptomSystemGroup,
} from "@/components/phase4/diagnosis/SymptomPicker";
import { FirstTimeBanner } from "@/components/phase4/FirstTimeBanner";
import { cn } from "@/lib/utils";

interface DiagnosisToolProps {
  systems: SymptomSystemGroup[];
  brands: readonly string[];
}

type Path = "code" | "symptoms";

export function DiagnosisTool({ systems, brands }: DiagnosisToolProps) {
  const [path, setPath] = useState<Path>("code");
  const [selected, setSelected] = useState<string[]>([]);
  const [brand, setBrand] = useState("");

  const [codeDetail, setCodeDetail] = useState<DiagnosisCodeDetail | null>(null);
  const [symptomResult, setSymptomResult] =
    useState<DiagnosisBySymptomResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<null | (() => void)>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const scrollToResult = useCallback(() => {
    // Wait for the result to render before scrolling.
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  const loadCode = useCallback(
    async (code: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setSymptomResult(null);
      setCodeDetail(null);
      setLastAction(null);

      try {
        const response = await fetch(
          `/api/diagnosis/codes/${encodeURIComponent(code)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json()) as DiagnosisCodeDetail & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error ?? "لم نجد هذا الكود في القاعدة. جرّب كوداً آخر.",
          );
        }
        setCodeDetail(payload);
        scrollToResult();
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "حدث خطأ في الاتصال. جرّب مرة أخرى.",
        );
        setLastAction(() => () => {
          void loadCode(code);
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [scrollToResult],
  );

  const loadSymptoms = useCallback(async () => {
    if (selected.length === 0) {
      setError("اختر عرضاً واحداً على الأقل من الأعراض.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setCodeDetail(null);
    setSymptomResult(null);
    setLastAction(null);

    try {
      const response = await fetch("/api/diagnosis/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        cache: "no-store",
        body: JSON.stringify({ symptomIds: selected, brand: brand || undefined }),
      });
      const payload = (await response.json()) as DiagnosisBySymptomResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "حدث خطأ في الاتصال. جرّب مرة أخرى.");
      }
      setSymptomResult(payload);
      scrollToResult();
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      setError(
        cause instanceof Error
          ? cause.message
          : "حدث خطأ في الاتصال. جرّب مرة أخرى.",
      );
      setLastAction(() => () => {
        void loadSymptoms();
      });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [brand, scrollToResult, selected]);

  function toggleSymptom(symptomId: string) {
    setSelected((previous) => {
      if (previous.includes(symptomId)) {
        return previous.filter((id) => id !== symptomId);
      }
      if (previous.length >= 5) return previous;
      return [...previous, symptomId];
    });
    setError(null);
  }

  function resetAll() {
    setSelected([]);
    setBrand("");
    setCodeDetail(null);
    setSymptomResult(null);
    setError(null);
    setLastAction(null);
  }

  const hasResult = Boolean(codeDetail || symptomResult);

  return (
    <div className="space-y-6">
      <FirstTimeBanner guide="diagnosis" title="كيف يعمل التشخيص الموجّه؟">
        ابدأ بالكود إن كان لديك جهاز فحص، أو اختر الأعراض إن لم يكن. النتائج
        اقتراحات فحص مبنية على ربط محافظ، وتظهر دائماً بعلامة «تقدير تقريبي».
      </FirstTimeBanner>

      <div className="surface-card p-4 sm:p-6">
        <div
          role="tablist"
          aria-label="طريقة التشخيص"
          className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-surface-sunken/60 p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={path === "code"}
            onClick={() => {
              setPath("code");
              setError(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-colors",
              path === "code"
                ? "bg-accent text-background shadow-accent-glow"
                : "text-muted-strong hover:bg-surface hover:text-white",
            )}
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            عندي كود OBD
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={path === "symptoms"}
            onClick={() => {
              setPath("symptoms");
              setError(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-colors",
              path === "symptoms"
                ? "bg-accent text-background shadow-accent-glow"
                : "text-muted-strong hover:bg-surface hover:text-white",
            )}
          >
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            عندي أعراض فقط
          </button>
        </div>

        <div className="mt-5" role="tabpanel">
          {path === "code" ? (
            <CodeSearch onSelect={(code) => void loadCode(code)} busy={loading} />
          ) : (
            <SymptomPicker
              systems={systems}
              brands={brands}
              selected={selected}
              brand={brand}
              onToggle={toggleSymptom}
              onBrandChange={setBrand}
              onClear={() => setSelected([])}
              onSubmit={() => void loadSymptoms()}
              busy={loading}
            />
          )}
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-surface-raised/50 p-4 text-[11px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
            جارٍ تحليل المعطيات واقتراح الاحتمالات…
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-[11px] text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 leading-6">{error}</span>
            {lastAction ? (
              <button
                type="button"
                onClick={() => {
                  const action = lastAction;
                  setLastAction(null);
                  action();
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-danger/30 px-2.5 font-bold"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={resultRef} className="scroll-mt-24">
        {codeDetail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-white">نتيجة الكود</h2>
              <button
                type="button"
                onClick={resetAll}
                className="text-[11px] font-bold text-muted underline underline-offset-4 transition-colors hover:text-white"
              >
                بحث جديد
              </button>
            </div>
            <CodeDiagnosisResult detail={codeDetail} />
          </div>
        ) : null}

        {symptomResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-white">الاحتمالات المقترحة</h2>
              <button
                type="button"
                onClick={resetAll}
                className="text-[11px] font-bold text-muted underline underline-offset-4 transition-colors hover:text-white"
              >
                تشخيص جديد
              </button>
            </div>
            <SymptomDiagnosisResult
              result={symptomResult}
              onReset={() => {
                setSymptomResult(null);
                setError(null);
                setPath("symptoms");
              }}
            />
          </div>
        ) : null}

        {!hasResult && !loading && !error ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-sunken/40 p-6 text-center">
            <p className="text-sm font-bold text-muted-strong">
              النتائج ستظهر هنا بعد اختيار كود أو أعراض.
            </p>
            <p className="mt-1 text-[11px] leading-6 text-muted">
              كل نتيجة تتضمن شرحاً، خطوات فحص أولية، ومصادر مقترحة قابلة للحفظ
              والمقارنة.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
