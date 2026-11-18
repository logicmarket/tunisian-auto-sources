/**
 * File: app/tools/diagnosis/page.tsx
 * Purpose: Guided diagnostic tool. Path A resolves a known OBD code; Path B
 * turns 1–5 observable symptoms into three conservative, clearly labelled
 * candidates. Server component prepares the static catalogue.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ClipboardCheck, ShieldAlert, Stethoscope } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DiagnosisTool } from "@/components/phase4/diagnosis/DiagnosisTool";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSymptomCatalog } from "@/lib/phase4/diagnosis";
import { DIAGNOSIS_BRANDS } from "@/lib/phase4/symptom-catalog";
import {
  breadcrumbJsonLd,
  buildMetadata,
  howToJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "التشخيص الموجّه",
  description:
    "أدخل كود OBD أو اختر الأعراض التي تلاحظها للحصول على احتمالات فحص مرتبة، مع خطوات أولية ومصادر موثوقة.",
  path: "/tools/diagnosis",
  keywords: [
    "التشخيص الموجّه",
    "أعراض أعطال السيارات",
    "كود OBD",
    "تشخيص المحرك",
    "ورشة تونس",
  ],
});

const SAFETY_RULES = [
  "لا تستبدل قطعة بناءً على عرض واحد أو كود واحد.",
  "افحص مستوى الزيت وسائل التبريد والوقود قبل أي تشخيص عميق.",
  "أوقف المحرك فوراً عند ارتفاع الحرارة أو ضغط الزيت أو دخان كثيف.",
  "استعمل جهاز فحص يقرأ الأكواد الحالية والمعلّقة وتدفق البيانات.",
];

export default async function DiagnosisPage() {
  const systems = await getSymptomCatalog();

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "التشخيص الموجّه",
            description:
              "أداة تفاعلية تحوّل كود OBD أو مجموعة أعراض إلى احتمالات فحص مرتبة.",
            path: "/tools/diagnosis",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "التشخيص الموجّه", path: "/tools/diagnosis" },
          ]),
          howToJsonLd({
            name: "كيف تستخدم أداة التشخيص الموجّه",
            description:
              "خطوات تشغيل الأداة للوصول من الكود أو العَرَض إلى فحص عملي.",
            path: "/tools/diagnosis",
            steps: [
              "أدخل كود OBD الذي قرأه جهاز الفحص، أو ابدأ من الأعراض إذا لم يتوفر جهاز.",
              "اختر الأعراض التي تلاحظها (من 1 إلى 5 أعراض) وحدّد السيارة إن أمكن.",
              "راجع الاحتمالات المرتّبة ودرجة الثقة، ثم ابدأ بأرخص فحص وأسهله.",
              "افتح المصادر المرتبطة وتحقق من خطوات الصانع قبل استبدال أي قطعة.",
            ],
          }),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-accent/[0.08] via-transparent to-primary-800/25"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "التشخيص الموجّه" },
            ]}
          />

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-300">
                <Stethoscope className="h-3 w-3" aria-hidden="true" />
                أداة الورشة
              </p>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                من العَرَض إلى الفحص الصحيح
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-strong">
                عندك كود من جهاز الفحص؟ ابحث به مباشرة. لا تملك جهازاً؟ اختر
                الأعراض التي تراها وسنقترح أكثر ثلاثة أكواد احتمالاً، مع مصادر
                عربية وفرنسية وإنجليزية للفحص.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/obd-codes"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                قاعدة الأكواد
              </Link>
              <Link
                href="/contribute"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                أضف مصدراً
                <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <DiagnosisTool
            systems={systems}
            brands={DIAGNOSIS_BRANDS}
          />

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
                <ClipboardCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                قواعد السلامة
              </h2>
              <ul className="mt-3 space-y-2">
                {SAFETY_RULES.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2 text-[11px] leading-6 text-muted-strong"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-xs font-extrabold text-amber-100">
                    النتائج تقديرية (APPROXIMATE)
                  </p>
                  <p className="mt-1 text-[10px] leading-6 text-muted">
                    الربط بين الأعراض والأكواد مبني على عائلات OBD الموثقة، وليس
                    تشخيصاً نهائياً. أكّد دائماً بجهاز فحص ودليل الصانع.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card p-5">
              <h2 className="text-xs font-extrabold text-white">تحتاج مساعدة؟</h2>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                إن لم تجد الكود أو العرض المناسب، أرسل لنا المصدر الذي تعتمده في
                ورشتك وسنراجعه قبل النشر.
              </p>
              <Link
                href="/contribute"
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                اقترح مصدراً
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
