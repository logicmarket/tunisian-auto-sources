/**
 * File: app/obd-codes/page.tsx
 * Purpose: OBD-II code directory: hero, searchable corpus, P/B/C/U tabs,
 * severity filter, pagination, and a short reading guide.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, ScanLine, ShieldAlert } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ObdExplorer } from "@/components/obd/ObdExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  getAllObdCodes,
  getObdCategoryCounts,
  getObdCount,
  getObdSeverityCounts,
  getObdSystemCounts,
} from "@/lib/obd";
import { SYSTEM_META } from "@/lib/catalog";
import { firstParam } from "@/lib/params";
import {
  breadcrumbJsonLd,
  buildMetadata,
  getSeoStats,
  itemListJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getSeoStats();

  return buildMetadata({
    title: "دليل أكواد أخطاء OBD-II",
    description:
      `قاعدة ${stats.obdCodes} كود OBD-II بالعربية: معنى الكود، أسبابه ` +
      `المحتملة، خطوات الفحص، درجة الخطورة، والنظام المرتبط به.`,
    path: "/obd-codes",
    keywords: [
      "أكواد OBD-II",
      "أكواد الأعطال",
      "P0301",
      "P0171",
      "تشخيص السيارات",
      "OBD codes Arabic",
    ],
  });
}

const CODE_FAMILIES = [
  {
    letter: "P",
    title: "مجموعة نقل الحركة",
    description: "المحرك، الحقن، الإشعال، ناقل الحركة، والانبعاثات. أكثر ما تراه في الورشة.",
    tone: "border-red-400/20 bg-red-400/[0.06] text-red-300",
  },
  {
    letter: "B",
    title: "مجموعة الهيكل",
    description: "الوسائد الهوائية، شدّادات الأحزمة، حساسات التقييد، وأنظمة الراحة.",
    tone: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300",
  },
  {
    letter: "C",
    title: "مجموعة الشاسيه",
    description: "الفرامل المانعة للانغلاق، حساسات السرعة، التوجيه، وأنظمة الثبات.",
    tone: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
  },
  {
    letter: "U",
    title: "مجموعة الشبكة",
    description: "الاتصال بين وحدات التحكم عبر CAN، وفقدان الاتصال بوحدة معينة.",
    tone: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
  },
];

export default async function ObdCodesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [codes, categories, severities, count, systems] = await Promise.all([
    getAllObdCodes(),
    getObdCategoryCounts(),
    getObdSeverityCounts(),
    getObdCount(),
    getObdSystemCounts(),
  ]);

  const requestedCategory = firstParam(searchParams.category)?.toUpperCase();
  const initialCategory = ["P", "B", "C", "U"].includes(requestedCategory ?? "")
    ? requestedCategory
    : undefined;
  const requestedSeverity = firstParam(searchParams.severity);
  const initialSeverity = severities.some(
    (severity) => severity.value === requestedSeverity,
  )
    ? requestedSeverity
    : undefined;

  const guideSystems = SYSTEM_META.slice(0, 10);

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "دليل أكواد أخطاء OBD-II",
            description:
              "قاعدة أكواد OBD-II بالعربية مع الأسباب وخطوات الفحص ودرجة الخطورة.",
            path: "/obd-codes",
            type: "CollectionPage",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "دليل أكواد OBD-II", path: "/obd-codes" },
          ]),
          itemListJsonLd(
            "أكواد OBD-II الشائعة",
            codes.slice(0, 24).map((code) => ({
              name: `${code.code} — ${code.name_ar ?? code.name_en ?? "كود عطل"}`,
              path: `/obd-codes/${code.code}`,
            })),
          ),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs items={[{ label: "أكواد OBD" }]} />

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                قاعدة الأكواد
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                دليل أكواد أخطاء OBD-II
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base sm:leading-8">
                ابحث بالكود أو باسم العطل. كل كود يعرض معناه، أسبابه المحتملة،
                خطوات فحص مرتبة، درجة خطورته، والنظام المرتبط به. ابدأ بالأرخص
                قبل استبدال القطع.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="chip">
                <ScanLine className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                {formatNumber(count)} كود
              </span>
              <span className="chip">
                <Layers className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                {formatNumber(systems.length)} نظام
              </span>
              <span className="chip">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                {formatNumber(severities.reduce((sum, item) => sum + item.count, 0))} تقييم
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <ObdExplorer
          codes={codes}
          categories={categories}
          severities={severities}
          initialCategory={initialCategory}
          initialSeverity={initialSeverity}
        />
      </section>

      <section className="border-y border-line bg-surface-sunken/40 py-10 sm:py-12">
        <div className="container-page">
          <SectionHeading
            eyebrow="أساسيات القراءة"
            title="كيف تقرأ كود OBD؟"
            description="الحرف الأول يحدد مجموعة النظام، والأرقام تحدد الدائرة والعطل. معرفة الحرف تختصر عليك نصف الطريق."
            action={
              <Link
                href="/how-to-use"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                كيف تستعمل الدليل؟
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CODE_FAMILIES.map((family) => (
              <div
                key={family.letter}
                className={`rounded-2xl border p-4 ${family.tone}`}
              >
                <span
                  className="font-mono text-2xl font-extrabold leading-none"
                  dir="ltr"
                >
                  {family.letter}
                </span>
                <h3 className="mt-2 text-sm font-extrabold text-white">
                  {family.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-6 text-muted">
                  {family.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <BookOpen className="h-4 w-4 text-accent-400" aria-hidden="true" />
                أدلة الأنظمة العشرة
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                كل دليل يشرح النظام، كيف تستعمل المصادر، المصطلحات التقنية
                بالعربية والفرنسية والإنجليزية، والأخطاء الشائعة.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {guideSystems.map((system) => (
                  <Link
                    key={system.slug}
                    href={`/categories/${system.slug}/guide`}
                    className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-xs font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                  >
                    <span>{system.label}</span>
                    <ArrowLeft className="h-3 w-3 shrink-0 text-muted/50" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
              <h2 className="text-sm font-extrabold text-white">تنبيه مهني</h2>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                الكود يشير إلى الدائرة أو النظام المتأثر، وليس بالضرورة إلى
                القطعة التالفة. ابدأ دائماً بالفحص البصري وقياس الجهد والاتصال
                قبل الاستبدال. الأكواد المعلّمة UNVERIFIED خاصة بالصانع وقد
                يختلف معناها حسب الطراز.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
