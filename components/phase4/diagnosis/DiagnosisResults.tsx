"use client";

/**
 * File: components/phase4/diagnosis/DiagnosisResults.tsx
 * Purpose: Present Path A (single code) and Path B (symptom matches) results
 * with explicit APPROXIMATE labelling, safety steps and source actions.
 */

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Fingerprint,
  Link2,
  SearchX,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import type {
  DiagnosisBySymptomResult,
  DiagnosisCodeDetail,
  DiagnosisMatch,
} from "@/lib/types";
import { SeverityBadge, ConfidenceBadge, ApproximateBadge } from "@/components/phase4/ui/SeverityBadge";
import { DiagnosisSourceList } from "@/components/phase4/diagnosis/DiagnosisSourceList";
import { splitLines, cn, formatNumber } from "@/lib/utils";

interface CodeResultProps {
  detail: DiagnosisCodeDetail;
}

export function CodeDiagnosisResult({ detail }: CodeResultProps) {
  const { code, relatedCodes, sources, symptomHints } = detail;
  const causes = splitLines(code.causes);
  const steps = splitLines(code.diagnosis_steps);

  return (
    <div className="space-y-5">
      <div className="surface-card overflow-hidden">
        <div className="border-b border-line bg-surface-raised/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-lg font-extrabold tracking-wider text-accent-300">
                  {code.code}
                </span>
                <SeverityBadge severity={code.severity} />
                <ApproximateBadge />
              </div>
              <h3 className="mt-3 text-lg font-extrabold leading-snug text-white sm:text-xl">
                {code.name_ar ?? code.name_en ?? "كود بدون وصف مسجل"}
              </h3>
              {code.name_en ? (
                <p className="mt-1 text-[11px] text-muted" dir="ltr">
                  {code.name_en}
                </p>
              ) : null}
            </div>

            <Link
              href={`/obd-codes/${code.code}`}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              صفحة الكود الكاملة
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">
              <Fingerprint className="h-3 w-3 text-accent-400" aria-hidden="true" />
              {code.category}
            </span>
            {code.system_category ? (
              <span className="chip">{code.system_category}</span>
            ) : null}
            {code.family ? <span className="chip">عائلة {code.family}</span> : null}
            <span className="chip">
              <Link2 className="h-3 w-3 text-accent-400" aria-hidden="true" />
              {code.verification === "VERIFIED" ? "موثّق" : "غير موثّق"}
            </span>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-e">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
              <Wrench className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              الأسباب المحتملة
            </h4>
            {causes.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {causes.map((cause) => (
                  <li key={cause} className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
                    {cause}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] leading-6 text-muted">
                لا توجد أسباب مسجلة لهذا الكود في القاعدة.
              </p>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
              <ClipboardList className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              خطوات الفحص
            </h4>
            {steps.length > 0 ? (
              <ol className="mt-2 space-y-2">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[10px] font-extrabold text-accent-300">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[11px] leading-6 text-muted">
                لا توجد خطوات مسجلة. اتبع إجراءات الصانع للطراز قبل الاستبدال.
              </p>
            )}
          </div>
        </div>

        {code.source_note ? (
          <p className="border-t border-line px-4 py-3 text-[10px] leading-6 text-muted sm:px-5">
            <span className="font-bold text-muted-strong">ملاحظة المصدر: </span>
            {code.source_note}
          </p>
        ) : null}
      </div>

      {symptomHints.length > 0 ? (
        <div className="rounded-xl border border-line bg-surface-raised/40 p-4">
          <h4 className="text-xs font-extrabold text-white">
            أعراض قد ترتبط بهذا الكود
          </h4>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            هذه روابط تحريرية تقريبية، وليست تأكيداً للتشخيص.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {symptomHints.map((hint) => (
              <span key={hint} className="chip">
                {hint}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {relatedCodes.length > 0 ? (
        <div>
          <h4 className="text-xs font-extrabold text-white">أكواد قريبة في نفس العائلة</h4>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {relatedCodes.map((related) => (
              <Link
                key={related.code}
                href={`/obd-codes/${related.code}`}
                className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 py-2 transition-colors hover:border-accent/35 hover:bg-surface-raised"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-extrabold text-accent-300">
                    {related.code}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[10px] text-muted-strong">
                    {related.name_ar ?? related.name_en ?? "بدون وصف"}
                  </span>
                </span>
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <DiagnosisSourceList sources={sources} />

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="text-[10px] leading-6 text-muted">
          الكود يحدد النظام المتأثر لا القطعة التالفة. افحص الأسلاك والتوصيلات
          والضغط قبل استبدال أي حساس، واعتمد دليل الصانع للطراز.
        </p>
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: DiagnosisMatch;
  index: number;
}

function MatchCard({ match, index }: MatchCardProps) {
  const { code } = match;

  return (
    <article className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-[11px] font-extrabold text-accent-300">
            {index + 1}
          </span>
          <Link
            href={`/obd-codes/${code.code}`}
            className="rounded font-mono text-base font-extrabold tracking-wider text-accent-300 hover:underline"
          >
            {code.code}
          </Link>
          <SeverityBadge severity={code.severity} />
          <ConfidenceBadge confidence={match.confidence} />
          {match.brandMatched ? (
            <span className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
              يطابق نوع السيارة
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-bold text-muted">
          تطابق {formatNumber(match.matchedSymptoms.length)}{" "}
          {match.matchedSymptoms.length === 1 ? "عرض" : "أعراض"}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-extrabold leading-snug text-white">
          {code.name_ar ?? code.name_en ?? "كود بدون وصف مسجل"}
        </h3>
        {code.name_en ? (
          <p className="mt-0.5 text-[10px] text-muted" dir="ltr">
            {code.name_en}
          </p>
        ) : null}

        {match.matchedSymptoms.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.matchedSymptoms.map((symptom) => (
              <span
                key={symptom}
                className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/[0.07] px-2.5 py-1 text-[10px] font-bold text-accent-200"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {symptom}
              </span>
            ))}
          </div>
        ) : null}

        {match.explanations.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-xl border border-line bg-surface-raised/40 p-3">
            {match.explanations.map((explanation) => (
              <li key={explanation} className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
                {explanation}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[10px] text-muted">
            درجة التطابق الداخلية: {formatNumber(match.score)}
          </span>
          <Link
            href={`/obd-codes/${code.code}`}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            تفاصيل الكود
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {match.relatedCodes.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-muted">أكواد مرتبطة:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {match.relatedCodes.slice(0, 3).map((related) => (
                <Link
                  key={related.code}
                  href={`/obd-codes/${related.code}`}
                  className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-accent-200"
                >
                  {related.code}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <DiagnosisSourceList
          sources={match.sources}
          title="مصادر لهذا الكود"
          className="mt-4 border-t border-line pt-3"
        />
      </div>
    </article>
  );
}

interface SymptomResultProps {
  result: DiagnosisBySymptomResult;
  onReset: () => void;
}

export function SymptomDiagnosisResult({ result, onReset }: SymptomResultProps) {
  const { matches, symptoms, brand, initialSteps } = result;

  if (matches.length === 0) {
    return (
      <div className="surface-card p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-inset ring-amber-400/20">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-base font-extrabold text-white">
          لم نجد نتيجة مطابقة. جرّب أعراض أخرى أو ابحث بالكود مباشرة
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-[11px] leading-6 text-muted">
          نستعمل ربطاً تحريرياً محافظاً، وبعض الأعراض لا تقابلها أكواد OBD موثقة.
          هذا لا يعني عدم وجود عطل — بل يعني الحاجة إلى فحص مباشر أو جهاز تشخيص.
        </p>

        {initialSteps.length > 0 ? (
          <div className="mx-auto mt-5 max-w-xl rounded-xl border border-line bg-surface-raised/50 p-4 text-start">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
              <ClipboardList className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              خطوات أولية آمنة
            </h4>
            <ul className="mt-2 space-y-1.5">
              {initialSteps.map((step) => (
                <li key={step} className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong">
                  <CheckCircle2 className="mt-1 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            اختر أعراضاً أخرى
          </button>
          <Link
            href="/obd-codes"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            تصفّح قاعدة الأكواد
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-white">
              نتائج تقديرية — افحص ولا تستبدل مباشرة
            </h3>
          </div>
          <ApproximateBadge />
        </div>
        <p className="mt-2 text-[11px] leading-6 text-muted">
          {formatNumber(symptoms.length)}{" "}
          {symptoms.length === 1 ? "عرض محدد" : "أعراض محددة"}
          {brand ? ` · نوع السيارة: ${brand}` : ""}. النتائج مرتّبة حسب قوة
          التطابق، وأعلى ثلاثة احتمالات فقط تُعرض لتجنّب التشتيت.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {symptoms.map((symptom) => (
            <span key={symptom.id} className="chip">
              {symptom.name_ar}
            </span>
          ))}
        </div>
      </div>

      {initialSteps.length > 0 ? (
        <div className="surface-card p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
            <ClipboardList className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            خطوات أولية قبل أي استبدال
          </h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {initialSteps.map((step) => (
              <li key={step} className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong">
                <CheckCircle2 className="mt-1 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        {matches.map((match, index) => (
          <MatchCard key={match.code.code} match={match} index={index} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
          تعديل الأعراض
        </button>
        <Link
          href="/obd-codes"
          className={cn(
            "inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white",
          )}
        >
          <BookOpen className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
          كل الأكواد
        </Link>
      </div>
    </div>
  );
}
