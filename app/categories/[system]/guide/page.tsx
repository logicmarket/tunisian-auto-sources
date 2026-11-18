/**
 * File: app/categories/[system]/guide/page.tsx
 * Purpose: Long-form system guide: intro, source-usage tips, trilingual
 * glossary, common mistakes and required tools.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Languages,
  Lightbulb,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CatalogIcon } from "@/components/ui/CatalogIcon";
import { SYSTEM_TONE_CLASSES } from "@/components/ui/category-tones";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getSystemMetaBySlug,
  resolveSystemParam,
  systemHref,
} from "@/lib/catalog";
import { getGuideForSystem } from "@/lib/guides";
import {
  breadcrumbJsonLd,
  buildMetadata,
  techArticleJsonLd,
} from "@/lib/seo";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

interface GuidePageProps {
  params: { system: string };
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const meta = getSystemMetaBySlug(params.system);
  const guide = getGuideForSystem(meta);
  if (!meta || !guide) {
    return { title: "دليل غير موجود", robots: { index: false, follow: true } };
  }
  return buildMetadata({
    title: guide.title,
    description:
      guide.intro[0]?.slice(0, 155) ??
      `دليل عملي لمصادر ${meta.label}: مصطلحات، نصائح، أخطاء شائعة وأدوات.`,
    path: `/categories/${meta.slug}/guide`,
    keywords: [
      meta.label,
      `دليل ${meta.label}`,
      "مصطلحات السيارات",
      "أدوات الورشة",
      "صيانة السيارات تونس",
    ],
  });
}

export default async function SystemGuidePage({ params }: GuidePageProps) {
  const meta = getSystemMetaBySlug(params.system);
  const guide = getGuideForSystem(meta);
  if (!meta || !guide) notFound();

  const tone = SYSTEM_TONE_CLASSES[meta.tone];
  const systemValue = resolveSystemParam(meta.slug);

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          techArticleJsonLd({
            headline: guide.title,
            description: guide.intro[0] ?? meta.description,
            path: `/categories/${meta.slug}/guide`,
            keywords: [meta.label, "دليل", "مصطلحات", "أدوات"],
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "التصنيفات", path: "/categories" },
            { name: meta.label, path: `/categories/${meta.slug}` },
            { name: "الدليل", path: `/categories/${meta.slug}/guide` },
          ]),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-primary-800/40 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: "التصنيفات", href: "/categories" },
              { label: meta.label, href: systemHref(meta.value) },
              { label: "الدليل" },
            ]}
          />

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${tone.icon}`}
              >
                <CatalogIcon name={meta.icon} className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                  دليل النظام
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {guide.title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-strong">
                  {meta.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className={`chip border-transparent ${tone.badge}`}>
                {formatNumber(guide.terms.length)} مصطلح
              </span>
              <span className="chip">{formatNumber(guide.tips.length)} نصيحة</span>
              <span className="chip">{formatNumber(guide.tools.length)} أداة</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div className="space-y-6">
            <article className="surface-card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <BookOpen className="h-4 w-4 text-accent-400" aria-hidden="true" />
                مقدمة النظام
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-8 text-muted-strong">
                {guide.intro.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>

            <section className="surface-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" />
                كيف تستخدم المصادر
              </h2>
              <ol className="mt-4 space-y-3">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[11px] font-extrabold tabular-nums text-accent-300 ring-1 ring-inset ring-accent/20">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-xs leading-6 text-muted-strong">
                      {tip}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="surface-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Languages className="h-4 w-4 text-sky-300" aria-hidden="true" />
                مصطلحات أساسية
              </h2>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                العربية والفرنسية والإنجليزية، حتى تبحث في المصادر الأجنبية
                بالمصطلح الصحيح وتفهم تقرير الفحص.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-start text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                      <th className="px-2 py-2 text-start font-bold">العربية</th>
                      <th className="px-2 py-2 text-start font-bold">Français</th>
                      <th className="px-2 py-2 text-start font-bold">English</th>
                      <th className="px-2 py-2 text-start font-bold">التعريف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.terms.map((term) => (
                      <tr key={term.en} className="border-b border-line/60 align-top">
                        <td className="px-2 py-2.5 font-bold text-muted-strong">{term.ar}</td>
                        <td className="px-2 py-2.5 text-muted" dir="ltr">{term.fr}</td>
                        <td className="px-2 py-2.5 text-muted" dir="ltr">{term.en}</td>
                        <td className="px-2 py-2.5 text-[11px] leading-5 text-muted">{term.def}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="surface-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <AlertTriangle className="h-4 w-4 text-red-300" aria-hidden="true" />
                أخطاء شائعة
              </h2>
              <ul className="mt-4 space-y-2.5">
                {guide.mistakes.map((mistake, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-3 py-2.5"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
                    <span className="text-xs leading-6 text-muted-strong">{mistake}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Wrench className="h-4 w-4 text-accent-400" aria-hidden="true" />
                الأدوات المطلوبة
              </h2>
              <ul className="mt-3 space-y-2">
                {guide.tools.map((tool) => (
                  <li key={tool} className="flex items-start gap-2 text-[11px] leading-6 text-muted">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    {tool}
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card p-5">
              <h2 className="text-sm font-extrabold text-white">روابط سريعة</h2>
              <div className="mt-3 space-y-2">
                <Link
                  href={systemHref(meta.value)}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  مصادر {meta.label}
                  <ArrowLeft className="h-3 w-3 text-muted/50" aria-hidden="true" />
                </Link>
                <Link
                  href="/obd-codes"
                  className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  دليل أكواد OBD-II
                  <ArrowLeft className="h-3 w-3 text-muted/50" aria-hidden="true" />
                </Link>
                <Link
                  href="/how-to-use"
                  className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  كيف تستعمل المنصة
                  <ArrowLeft className="h-3 w-3 text-muted/50" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {systemValue ? (
              <p className="text-[10px] leading-5 text-muted/70">
                التصنيف الداخلي: {systemValue}
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
