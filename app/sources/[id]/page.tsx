/**
 * File: app/sources/[id]/page.tsx
 * Purpose: Full source detail: prominent external action, Arabic
 * description, metadata grid, visitor rating/helpful widget, and related
 * sources. Everything a mechanic needs before opening an external site.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  ExternalLink,
  Globe2,
  Layers,
  Link2,
  ShieldAlert,
  Star,
  Tag,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { LinkStatusBadge } from "@/components/ui/LinkStatusBadge";
import { RatingStars } from "@/components/ui/RatingStars";
import { SourceCard } from "@/components/ui/SourceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { BookmarkButton } from "@/components/phase4/BookmarkButton";
import { CompareButton } from "@/components/phase4/CompareButton";
import { RatingWidget } from "@/components/phase4/RatingWidget";
import {
  getLanguageLabel,
  getLinkStatusMeta,
  getSystemLabel,
} from "@/lib/labels";
import { getRelatedSources, getSourceById } from "@/lib/queries";
import { systemHref } from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  buildMetadata,
  webPageJsonLd,
} from "@/lib/seo";
import {
  formatArabicDate,
} from "@/lib/utils";

export const revalidate = 3600;

interface SourcePageProps {
  params: { id: string };
}

function parseSourceId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function generateMetadata({
  params,
}: SourcePageProps): Promise<Metadata> {
  const id = parseSourceId(params.id);
  const source = id ? await getSourceById(id) : null;

  if (!source) {
    notFound();
  }

  return buildMetadata({
    title: source.name,
    description: source.description_ar.slice(0, 155),
    path: `/sources/${source.id}`,
    type: "article",
    modifiedTime: source.updated_at,
    keywords: [
      source.name,
      source.category_system,
      source.category_task,
      source.language,
      "مصدر سيارات",
      "دليل إصلاح",
      "تونس",
    ],
  });
}

export default async function SourcePage({ params }: SourcePageProps) {
  const id = parseSourceId(params.id);
  if (!id) notFound();

  const source = await getSourceById(id);
  if (!source) notFound();

  const related = await getRelatedSources(
    source.id,
    source.category_system,
    source.category_task,
    6,
  );

  const hostname = getHostname(source.url);
  const status = getLinkStatusMeta(source.link_status);

  const facts = [
    {
      label: "التصنيف",
      icon: Layers,
      content: (
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge kind="system" value={source.category_system} />
          <CategoryBadge kind="task" value={source.category_task} />
        </div>
      ),
    },
    {
      label: "اللغة",
      icon: Globe2,
      content: (
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge kind="language" value={source.language} />
          <span className="text-[11px] text-muted">
            {getLanguageLabel(source.language)}
          </span>
        </div>
      ),
    },
    {
      label: "حالة الرابط",
      icon: Link2,
      content: <LinkStatusBadge status={source.link_status} lastVerified={source.last_verified} />,
    },
    {
      label: "آخر فحص",
      icon: CalendarCheck,
      content: (
        <span className="text-sm font-bold text-white">
          {formatArabicDate(source.last_verified)}
        </span>
      ),
    },
    {
      label: "التقييم",
      icon: Star,
      content: (
        <div className="space-y-1">
          <RatingStars rating={source.rating} />
          <p className="text-[10px] text-muted">
            تقييم تحريري · تقييمات الزوار تظهر في صندوق التقييم أدناه
          </p>
        </div>
      ),
    },
  ];

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: source.name,
            description: source.description_ar.slice(0, 300),
            path: `/sources/${source.id}`,
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "المصادر", path: "/sources" },
            {
              name: getSystemLabel(source.category_system),
              path: systemHref(source.category_system),
            },
            { name: source.name, path: `/sources/${source.id}` },
          ]),
        ]}
      />

      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-accent/[0.07] via-transparent to-primary-800/25"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "المصادر", href: "/sources" },
              {
                label: getSystemLabel(source.category_system),
                href: systemHref(source.category_system),
              },
              { label: source.name },
            ]}
          />

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LinkStatusBadge status={source.link_status} lastVerified={source.last_verified} />
                <span className="chip">
                  <Tag className="h-3 w-3 text-accent-400" aria-hidden="true" />
                  مصدر #{source.id}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {source.name}
              </h1>

              {hostname ? (
                <p
                  className="mt-2 text-xs font-semibold text-muted"
                  dir="ltr"
                >
                  {hostname}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CategoryBadge kind="system" value={source.category_system} size="md" />
                <CategoryBadge kind="task" value={source.category_task} size="md" />
                <CategoryBadge kind="language" value={source.language} size="md" />
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`افتح ${source.name} في تبويب جديد`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90"
              >
                افتح المصدر
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>

              <Link
                href="/sources"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                كل المصادر
              </Link>

              <div className="flex gap-2">
                <BookmarkButton
                  sourceId={source.id}
                  sourceName={source.name}
                  showLabel
                  className="flex-1"
                />
                <CompareButton
                  sourceId={source.id}
                  sourceName={source.name}
                  showLabel
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-6">
            <article className="surface-card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Wrench className="h-4 w-4 text-accent-400" aria-hidden="true" />
                عن هذا المصدر
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-muted-strong sm:text-[15px]">
                {source.description_ar}
              </p>

              {source.description_fr ? (
                <details className="mt-5 rounded-xl border border-line bg-surface-raised/60 p-3">
                  <summary className="cursor-pointer text-[11px] font-bold text-muted-strong">
                    الوصف بالفرنسية
                  </summary>
                  <p
                    lang="fr"
                    dir="ltr"
                    className="mt-2 text-xs leading-6 text-muted"
                  >
                    {source.description_fr}
                  </p>
                </details>
              ) : null}
            </article>

            <section
              aria-label="بيانات المصدر"
              className="surface-card overflow-hidden"
            >
              <h2 className="border-b border-line px-5 py-4 text-sm font-extrabold text-white sm:px-6">
                بيانات سريعة
              </h2>

              <dl className="grid gap-px bg-line sm:grid-cols-2">
                {facts.map((fact) => {
                  const Icon = fact.icon;
                  return (
                    <div key={fact.label} className="bg-surface p-4 sm:p-5">
                      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        <Icon className="h-3 w-3 text-accent-400" aria-hidden="true" />
                        {fact.label}
                      </dt>
                      <dd className="mt-2">{fact.content}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <p className="text-[11px] leading-6 text-muted">
                  هذه صفحة دليل وليست بديلاً عن إجراءات الصانع. تحقّق من رقم
                  الهيكل والطراز قبل الاعتماد على أي مصدر، ولا تشارك بيانات
                  حسابك مع مواقع غير موثوقة. حالة الرابط الحالية:{" "}
                  <span className="font-bold text-amber-200">{status.label}</span>.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <RatingWidget
              sourceId={source.id}
              sourceName={source.name}
              initialAverage={0}
              initialTotal={0}
            />

            <div className="surface-card p-5">
              <h2 className="text-sm font-extrabold text-white">وجدت مشكلة؟</h2>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                إذا كان الرابط لا يعمل أو أن الوصف غير دقيق، أبلغنا لنراجعه
                ونحدّث حالة المصدر.
              </p>
              <Link
                href="/about#contact"
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                الإبلاغ عن مشكلة
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-line bg-surface-sunken/40 py-10 sm:py-12">
          <div className="container-page">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                  من نفس العائلة
                </p>
                <h2 className="mt-1.5 text-2xl font-extrabold text-white">
                  مصادر مشابهة
                </h2>
                <p className="mt-1 text-xs text-muted">
                  من نفس النظام أو نفس نوع المهمة.
                </p>
              </div>
              <Link
                href={systemHref(source.category_system)}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                تصفّح النظام
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <SourceCard key={item.id} source={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
