/**
 * File: app/obd-codes/[code]/page.tsx
 * Purpose: Full OBD-II code sheet: large code block, Arabic/English names,
 * severity, meaning, causes, ordered checks, related system, sources,
 * similar codes, and a print-ready poster.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  ListChecks,
  ScanLine,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PrintButton } from "@/components/obd/PrintButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { SourceCard } from "@/components/ui/SourceCard";
import { getSystemMeta, systemHref } from "@/lib/catalog";
import {
  getObdCategoryLabel,
  getSeverityMeta,
  severityToneClasses,
} from "@/lib/labels";
import { getObdCodeByCode, getRelatedObdCodes } from "@/lib/obd";
import { listSources } from "@/lib/queries";
import {
  breadcrumbJsonLd,
  buildMetadata,
  howToJsonLd,
  techArticleJsonLd,
} from "@/lib/seo";
import { cn, splitLines } from "@/lib/utils";

export const revalidate = 3600;

interface ObdDetailProps {
  params: { code: string };
}

export async function generateMetadata({
  params,
}: ObdDetailProps): Promise<Metadata> {
  const code = await getObdCodeByCode(params.code);
  if (!code) {
    return { title: "كود غير موجود", robots: { index: false, follow: true } };
  }

  const keywords = [
    code.code,
    code.name_ar,
    code.name_en,
    code.system_category,
    code.related_system,
    "OBD-II",
    "أكواد الأعطال",
  ].filter((value): value is string => Boolean(value));

  return buildMetadata({
    title: `${code.code} — ${code.name_ar ?? "كود عطل"}`,
    description:
      code.description?.slice(0, 155) ??
      `معنى وأسباب وخطوات فحص الكود ${code.code}.`,
    path: `/obd-codes/${code.code}`,
    type: "article",
    keywords,
  });
}

export default async function ObdDetailPage({ params }: ObdDetailProps) {
  const code = await getObdCodeByCode(params.code);
  if (!code) notFound();

  const [relatedCodes, sources] = await Promise.all([
    getRelatedObdCodes(code.code, code.category, 6),
    listSources({ task: "OBD / Error Codes", limit: 4 }),
  ]);

  const causes = splitLines(code.causes);
  const steps = splitLines(code.diagnosis_steps);
  const severity = getSeverityMeta(code.severity);
  const systemMeta = getSystemMeta(code.related_system);
  const unverified = code.verification === "UNVERIFIED";

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          techArticleJsonLd({
            headline: `${code.code} — ${code.name_ar ?? "كود عطل"}`,
            description:
              code.description?.slice(0, 300) ??
              `معنى وأسباب وخطوات فحص الكود ${code.code}.`,
            path: `/obd-codes/${code.code}`,
            keywords: [code.code, code.name_ar, code.name_en, "OBD-II"].filter(
              (value): value is string => Boolean(value),
            ),
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "دليل أكواد OBD-II", path: "/obd-codes" },
            { name: code.code, path: `/obd-codes/${code.code}` },
          ]),
          ...(steps.length > 0
            ? [
                howToJsonLd({
                  name: `فحص الكود ${code.code} خطوة بخطوة`,
                  description:
                    `خطوات فحص مرتّبة للكود ${code.code} ` +
                    `${code.name_ar ? `(${code.name_ar})` : ""}.`,
                  path: `/obd-codes/${code.code}`,
                  steps,
                }),
              ]
            : []),
        ]}
      />

      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-violet-500/[0.08] via-transparent to-primary-800/25"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "دليل أكواد OBD-II", href: "/obd-codes" },
              { label: code.code },
            ]}
          />

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] px-5 py-4 text-accent-300 shadow-accent-glow sm:w-52">
                <ScanLine className="h-4 w-4 opacity-70" aria-hidden="true" />
                <span
                  className="mt-1 font-mono text-4xl font-extrabold tracking-[0.08em] sm:text-5xl"
                  dir="ltr"
                >
                  {code.code}
                </span>
                <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-400/80">
                  {getObdCategoryLabel(code.category)}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                      severityToneClasses[severity.tone],
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                    خطورة {severity.label}
                  </span>
                  {unverified ? (
                    <span className="inline-flex rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold text-violet-300">
                      UNVERIFIED — كود خاص بالصانع
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      معرّف عام موحّد
                    </span>
                  )}
                  {code.system_category ? (
                    <span className="inline-flex rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
                      {code.system_category}
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                  {code.name_ar ?? "كود عطل"}
                </h1>
                {code.name_en ? (
                  <p className="mt-1.5 text-sm font-semibold text-muted" dir="ltr">
                    {code.name_en}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <PrintButton />
              <Link
                href={`/search?q=${encodeURIComponent(code.code)}`}
                className="no-print inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                مصادر لهذا الكود
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div className="space-y-6">
            {code.description ? (
              <article className="surface-card p-5 sm:p-7">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <BookOpen className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  ماذا يعني هذا الكود؟
                </h2>
                <p className="mt-4 text-sm leading-8 text-muted-strong">
                  {code.description}
                </p>
                <p className="mt-3 rounded-xl border border-line bg-surface-raised/50 px-3 py-2 text-[11px] leading-6 text-muted">
                  {code.source_note}
                </p>
              </article>
            ) : null}

            {causes.length > 0 ? (
              <section className="surface-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  الأسباب المحتملة
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {causes.map((cause, index) => (
                    <li
                      key={`${cause}-${index}`}
                      className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-raised/50 px-3 py-2.5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                      <span className="text-xs leading-6 text-muted-strong">
                        {cause}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {steps.length > 0 ? (
              <section className="surface-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <ListChecks className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  خطوات التشخيص
                </h2>
                <p className="mt-2 text-[11px] leading-6 text-muted">
                  اتبع الترتيب من الأرخص إلى الأغلى، وسجّل نتيجة كل خطوة قبل
                  الانتقال إلى التالية.
                </p>
                <ol className="mt-4 space-y-3">
                  {steps.map((step, index) => (
                    <li key={`${step}-${index}`} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[11px] font-extrabold tabular-nums text-accent-300 ring-1 ring-inset ring-accent/20">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-xs leading-6 text-muted-strong">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section className="surface-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Layers className="h-4 w-4 text-accent-400" aria-hidden="true" />
                النظام المرتبط
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                هذا الكود ينتمي إلى مجموعة <strong className="text-muted-strong">{getObdCategoryLabel(code.category)}</strong>{" "}
                ويخدم أساساً نظام <strong className="text-muted-strong">{code.related_system ?? "غير محدد"}</strong>.
              </p>
              {systemMeta ? (
                <Link
                  href={systemHref(systemMeta.value)}
                  className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  مصادر {systemMeta.label}
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </section>

            {relatedCodes.length > 0 ? (
              <section className="surface-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <ScanLine className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  أكواد مشابهة
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {relatedCodes.map((related) => (
                    <Link
                      key={related.code}
                      href={`/obd-codes/${related.code}`}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 transition-colors hover:border-accent/40"
                    >
                      <span
                        className="font-mono text-[11px] font-bold text-accent-300"
                        dir="ltr"
                      >
                        {related.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-strong">
                        {related.name_ar ?? "كود عطل"}
                      </span>
                      <ArrowLeft className="h-3 w-3 shrink-0 text-muted/50" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="no-print rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <p className="text-[11px] leading-6 text-muted">
                  المعلومات إرشادية وليست تعليمات صانع. لا تستبدل قطعة بناءً على
                  الكود وحده؛ أكّد العطل بقياس كهربائي أو ميكانيكي، خاصة في
                  أنظمة الحقن والإشعال والوسائد الهوائية.
                </p>
              </div>
            </div>
          </div>

          <aside className="no-print space-y-4 lg:sticky lg:top-24">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                ملخص سريع
              </h2>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">الكود</dt>
                  <dd className="font-mono font-bold text-accent-300" dir="ltr">
                    {code.code}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">المجموعة</dt>
                  <dd className="text-end font-bold text-muted-strong">
                    {getObdCategoryLabel(code.category)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">النظام</dt>
                  <dd className="text-end font-bold text-muted-strong">
                    {code.related_system ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">الخطورة</dt>
                  <dd className={cn("rounded-full border px-2 py-0.5 font-bold", severityToneClasses[severity.tone])}>
                    {severity.label}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">الأسباب</dt>
                  <dd className="font-bold tabular-nums text-muted-strong">
                    {causes.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">خطوات الفحص</dt>
                  <dd className="font-bold tabular-nums text-muted-strong">
                    {steps.length}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-sm font-extrabold text-white">درجة الخطورة</h2>
              <p className={cn("mt-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold", severityToneClasses[severity.tone])}>
                {severity.label}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                {severity.description}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {sources.length > 0 ? (
        <section className="no-print border-t border-line bg-surface-sunken/40 py-10">
          <div className="container-page">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                  من قاعدة المصادر
                </p>
                <h2 className="mt-1.5 text-2xl font-extrabold text-white">
                  مصادر إضافية
                </h2>
                <p className="mt-1 text-xs text-muted">
                  قواعد بيانات وأدلة تساعدك على تفسير الأكواد والوصول إلى إجراءات الصانع.
                </p>
              </div>
              <Link
                href="/sources?task=obd-error-codes"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                كل مصادر الأكواد
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        className="print-only print-poster-wrap"
        aria-label="نسخة قابلة للطباعة"
      >
        <div className="print-poster rounded-2xl border-2 border-black p-6 text-black">
          <h2 className="mb-3 border-b border-black/30 pb-2 text-sm font-extrabold">
            نسخة قابلة للطباعة — بطاقة الورشة
          </h2>
          <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
                بطاقة تشخيص OBD-II — تونس
              </p>
              <p className="mt-1 font-mono text-4xl font-extrabold" dir="ltr">
                {code.code}
              </p>
              <p className="mt-2 text-lg font-extrabold">{code.name_ar}</p>
              <p className="text-xs" dir="ltr">{code.name_en}</p>
            </div>
            <div className="text-left text-xs">
              <p><strong>الخطورة:</strong> {severity.label}</p>
              <p className="mt-1"><strong>المجموعة:</strong> {getObdCategoryLabel(code.category)}</p>
              <p className="mt-1"><strong>النظام:</strong> {code.related_system}</p>
              <p className="mt-1"><strong>التحقق:</strong> {code.verification}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-extrabold uppercase">الأسباب المحتملة</h3>
              <ul className="mt-2 list-disc space-y-1 pe-4 text-[11px] leading-5">
                {causes.slice(0, 5).map((cause) => (
                  <li key={cause}>{cause}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase">أول خطوات الفحص</h3>
              <ol className="mt-2 list-decimal space-y-1 pe-4 text-[11px] leading-5">
                {steps.slice(0, 5).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <p className="mt-4 border-t border-black/30 pt-3 text-[9px] leading-4">
            بطاقة تعليمية مساعدة — راجع دليل الصانع قبل الاستبدال. {code.source_note}
          </p>
        </div>
      </section>
    </main>
  );
}
