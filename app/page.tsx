/**
 * File: app/page.tsx
 * Purpose: Phase 2 homepage. Fast paths for a mechanic: instant search,
 * ten system categories, quick task chips, newest and highest-rated
 * sources, common OBD codes, and a three-step getting-started guide.
 */

import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BookOpen,
  Database,
  Layers,
  ScanLine,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SourceCard } from "@/components/ui/SourceCard";
import { SystemGrid } from "@/components/home/SystemGrid";
import { QuickTaskChips } from "@/components/home/QuickTaskChips";
import { ObdQuickList } from "@/components/home/ObdQuickList";
import { HowToSteps } from "@/components/home/HowToSteps";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { SYSTEM_META } from "@/lib/catalog";
import {
  buildMetadata,
  catalogueSummary,
  datasetJsonLd,
  getSeoStats,
  itemListJsonLd,
} from "@/lib/seo";
import { getCommonObdCodes, getObdCount } from "@/lib/obd";
import {
  getCategoryCounts,
  getLatestSources,
  getPortalStats,
  getTopRatedSources,
} from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

// Homepage content is refreshed hourly from PostgreSQL (ISR).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getSeoStats();

  return buildMetadata({
    title: `بوابة مصادر السيارات التونسية — ${stats.sources} مصدراً و${stats.obdCodes} كود OBD-II`,
    description: catalogueSummary(stats),
    path: "/",
    absoluteTitle: true,
    keywords: [
      "مصادر السيارات التونسية",
      "دليل إصلاح السيارات",
      "أكواد OBD-II بالعربية",
      "تشخيص أعطال السيارات",
      "ورشات تونس",
      "automotive repair Tunisia",
    ],
  });
}

export default async function HomePage() {
  const [
    stats,
    categories,
    latest,
    topRated,
    commonCodes,
    obdCount,
    seo,
  ] = await Promise.all([
    getPortalStats(),
    getCategoryCounts(),
    getLatestSources(8),
    getTopRatedSources(8),
    getCommonObdCodes(10),
    getObdCount(),
    getSeoStats(),
  ]);

  const heroStats = [
    {
      label: "مصدر",
      value: formatNumber(stats.totalSources),
      icon: Database,
    },
    {
      label: "تصنيف",
      value: formatNumber(stats.systemCount),
      icon: Layers,
    },
    {
      label: "كود خطأ",
      value: formatNumber(obdCount),
      icon: ScanLine,
    },
  ];

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          datasetJsonLd(seo, categories.systems),
          itemListJsonLd(
            "أنظمة السيارات",
            SYSTEM_META.map((system) => ({
              name: system.label,
              path: `/categories/${system.slug}`,
            })),
          ),
        ]}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-70"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-hero-glow"
          aria-hidden="true"
        />

        <div className="container-page relative pb-12 pt-12 sm:pb-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3.5 py-1.5 text-[11px] font-bold text-accent-300 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              دليل ميداني لميكانيكيي الورشات التونسية
            </span>

            <h1 className="mt-5 text-3xl font-extrabold leading-[1.3] tracking-tight text-white sm:text-5xl lg:text-6xl">
              بوابة مصادر{" "}
              <span className="text-gradient">السيارات التونسية</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-muted-strong sm:text-xl">
              دليلك العملي لمصادر تشخيص وإصلاح السيارات — منظّم وموثوق
            </p>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-7 text-muted sm:text-sm">
              أدلة إصلاح، أكواد أعطال، مخططات كهربائية، برامج تشخيص، ومورّدون.
              مصنّفة حسب النظام والمهمة، وبواجهة عربية سريعة على الهاتف.
            </p>

            <div className="mx-auto mt-7 w-full max-w-2xl">
              <SearchBar inputId="home-search" />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {heroStats.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/80 px-3.5 py-2 shadow-card backdrop-blur"
                  >
                    <Icon className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                    <span className="text-sm font-extrabold tabular-nums text-white">
                      {item.value}
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {item.label}
                    </span>
                  </span>
                );
              })}

              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[11px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {formatNumber(stats.liveSources)} رابط نشط
              </span>
            </div>

            <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link
                href="/categories"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90 sm:w-auto"
              >
                تصفّح الأنظمة
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/sources"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white sm:w-auto"
              >
                <BookOpen className="h-4 w-4 text-accent-400" aria-hidden="true" />
                كل المصادر
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Systems ──────────────────────────────────────────── */}
      <section
        id="categories"
        className="container-page scroll-mt-24 py-10 sm:py-14"
      >
        <SectionHeading
          eyebrow="تصفّح حسب النظام"
          title="أنظمة السيارات"
          description="ابدأ من النظام الذي تعمل عليه. كل بطاقة تعرض عدد المصادر المتاحة فعلياً في قاعدة البيانات."
          action={
            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              كل التصنيفات
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        <SystemGrid counts={categories.systems} className="mt-7" />
      </section>

      {/* ── Task chips ───────────────────────────────────────── */}
      <section className="border-y border-line bg-surface-sunken/40 py-7 sm:py-9">
        <div className="container-page">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                أو ابدأ من المهمة
              </p>
              <h2 className="mt-1.5 text-xl font-extrabold text-white sm:text-2xl">
                ماذا تحتاج أن تفعل الآن؟
              </h2>
            </div>
            <p className="text-[11px] text-muted">
              اسحب أفقياً على الهاتف لرؤية كل المهام
            </p>
          </div>
          <QuickTaskChips counts={categories.tasks} className="mt-4" />
        </div>
      </section>

      {/* ── Latest sources ───────────────────────────────────── */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="محدّث باستمرار"
          title="أحدث المصادر المضافة"
          description="آخر ما أُضيف إلى الدليل، مع حالة الرابط وتقييم المصدر."
          action={
            <Link
              href="/sources?sort=latest"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </section>

      {/* ── Top rated ────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface-sunken/40 py-10 sm:py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="اختيار الورشات"
            title="الأكثر استخداماً"
            description="المصادر الأعلى تقييماً، مع أولوية للروابط التي تعمل."
            action={
              <Link
                href="/sources?sort=rating"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                عرض الكل
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topRated.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      </section>

      {/* ── OBD quick access ─────────────────────────────────── */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="وصول سريع"
          title="أكواد أخطاء OBD شائعة"
          description="اضغط على الكود لرؤية معناه وأسبابه وخطوات فحصه."
          action={
            <Link
              href="/obd-codes"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              قاعدة الأكواد
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <ObdQuickList codes={commonCodes} />

          <aside className="surface-card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300 ring-1 ring-inset ring-violet-400/20">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-extrabold text-white">قبل أن تستبدل قطعة</h3>
            </div>
            <p className="text-xs leading-6 text-muted">
              اقرأ الكود أولاً، ثم راقب بيانات التجميد (Freeze Frame)، وابدأ
              بأرخص فحص: البواجي، الهواء، والضغط. الكود يدلّك على الدائرة ولا
              يحدّد القطعة التالفة وحده.
            </p>
            <Link
              href="/obd-codes"
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 text-xs font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
            >
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              استكشف كل الأكواد
            </Link>
          </aside>
        </div>
      </section>

      {/* ── How to use ───────────────────────────────────────── */}
      <section className="container-page pb-12 sm:pb-16">
        <SectionHeading
          eyebrow="للمرة الأولى"
          title="كيف تستخدم المنصة"
          description="ثلاث خطوات فقط تفصلك عن المصدر المناسب لعطل اليوم."
          className="mb-7"
        />
        <HowToSteps />
      </section>

      {/* ── FAQ (visible + FAQPage JSON-LD) ──────────────────── */}
      <FaqSection />
    </main>
  );
}
