/**
 * File: app/categories/[system]/page.tsx
 * Purpose: One vehicle system, its explanation, a task/language filter
 * sidebar, the paginated source list, and a useful empty state.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  PackageOpen,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CatalogIcon } from "@/components/ui/CatalogIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Pagination } from "@/components/ui/Pagination";
import { SourceCard } from "@/components/ui/SourceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { SYSTEM_TONE_CLASSES } from "@/components/ui/category-tones";
import {
  SYSTEM_META,
  getLanguageSlug,
  getSystemMeta,
  getTaskMeta,
  resolveLanguageParam,
  resolveSystemParam,
  resolveTaskParam,
  systemHref,
} from "@/lib/catalog";
import {
  getCategoryCountsForSystem,
  getSourcesPage,
} from "@/lib/queries";
import { firstParam, parsePage } from "@/lib/params";
import {
  breadcrumbJsonLd,
  buildMetadata,
  itemListJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { formatNumber } from "@/lib/utils";

export const revalidate = 3600;

interface CategoryPageProps {
  params: { system: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const value = resolveSystemParam(params.system);
  const meta = getSystemMeta(value);

  if (!meta) {
    return { title: "تصنيف غير موجود", robots: { index: false, follow: true } };
  }

  return buildMetadata({
    title: `${meta.label} — مصادر ومراجع`,
    description: `${meta.description} تصفّح المصادر المتخصصة في ${meta.label} مع حالة الرابط واللغة والتقييم.`,
    path: `/categories/${meta.slug}`,
    keywords: [
      meta.label,
      `مصادر ${meta.label}`,
      "تشخيص السيارات",
      "إصلاح السيارات",
      "تونس",
    ],
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const systemValue = resolveSystemParam(params.system);
  const meta = getSystemMeta(systemValue);

  if (!systemValue || !meta) notFound();

  const taskSlug = firstParam(searchParams.task);
  const languageSlug = firstParam(searchParams.language);
  const pageParam = parsePage(searchParams.page);

  const taskValue = resolveTaskParam(taskSlug);
  const languageValue = resolveLanguageParam(languageSlug);

  const [scoped, sources] = await Promise.all([
    getCategoryCountsForSystem(systemValue),
    getSourcesPage(
      {
        system: systemValue,
        task: taskValue,
        language: languageValue,
      },
      pageParam,
      12,
      "rating",
    ),
  ]);

  const tone = SYSTEM_TONE_CLASSES[meta.tone];
  const activeTaskSlug = getTaskMeta(taskValue)?.slug;
  const activeLanguageSlug = languageValue
    ? getLanguageSlug(languageValue)
    : undefined;
  const hasFilters = Boolean(activeTaskSlug || activeLanguageSlug);

  const quickTasks = scoped.tasks.slice(0, 5);
  const query = {
    task: activeTaskSlug,
    language: activeLanguageSlug,
  };

  const relatedSystems = SYSTEM_META.filter(
    (system) => system.value !== meta.value,
  ).slice(0, 4);

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: `${meta.label} — مصادر ومراجع`,
            description: meta.description,
            path: `/categories/${meta.slug}`,
            type: "CollectionPage",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "التصنيفات", path: "/categories" },
            { name: meta.label, path: `/categories/${meta.slug}` },
          ]),
          itemListJsonLd(
            `مصادر ${meta.label}`,
            sources.items.map((source) => ({
              name: source.name,
              path: `/sources/${source.id}`,
            })),
          ),
        ]}
      />

      {/* Category header */}
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-primary-800/40 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: "التصنيفات", href: "/categories" },
              { label: meta.label },
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
                  تصفّح حسب النظام
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {meta.label}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-strong">
                  {meta.description}
                </p>
                <Link
                  href={`/categories/${meta.slug}/guide`}
                  className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.07] px-3.5 text-xs font-bold text-accent-200 transition-colors hover:border-accent/50 hover:text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  دليل هذا النظام: مصطلحات، نصائح، وأدوات
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
              <span className={`chip border-transparent ${tone.badge}`}>
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {formatNumber(sources.total)} مصدر
              </span>
              <span className="chip">
                <Wrench className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                {formatNumber(scoped.tasks.length)} مهام متاحة
              </span>
            </div>
          </div>

          {quickTasks.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-1.5">
              <span className="me-1 inline-flex min-h-9 items-center text-[11px] font-bold text-muted">
                الأكثر توفراً:
              </span>
              {quickTasks.map((task) => {
                const taskMeta = getTaskMeta(task.value);
                return (
                  <Link
                    key={task.value}
                    href={`/categories/${meta.slug}?task=${encodeURIComponent(
                      taskMeta?.slug ?? task.value,
                    )}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                  >
                    {taskMeta?.label ?? task.value}
                    <span className="tabular-nums text-muted/70">
                      {formatNumber(task.count)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {/* Filters + results */}
      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <FilterPanel
              basePath={`/categories/${meta.slug}`}
              tasks={scoped.tasks}
              languages={scoped.languages}
              active={{ task: activeTaskSlug, language: activeLanguageSlug }}
            />

            <div className="surface-card mt-4 p-4">
              <h2 className="text-xs font-extrabold text-white">نصيحة سريعة</h2>
              <p className="mt-2 text-[11px] leading-6 text-muted">
                ابدأ بمهمة واحدة فقط. إذا كانت النتائج قليلة، أزل فلتر اللغة
                أولاً لأن معظم المصادر المتخصصة بالإنجليزية.
              </p>
            </div>
          </div>

          <div>
            {sources.items.length > 0 ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    {hasFilters
                      ? "نتائج مصفّاة داخل هذا النظام"
                      : `كل مصادر ${meta.label}`}{" "}
                    ·{" "}
                    <span className="font-bold tabular-nums text-muted-strong">
                      {formatNumber(sources.total)}
                    </span>
                  </p>

                  {hasFilters ? (
                    <Link
                      href={`/categories/${meta.slug}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      إزالة الفلاتر
                    </Link>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {sources.items.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>

                <Pagination
                  currentPage={sources.page}
                  totalPages={sources.totalPages}
                  totalItems={sources.total}
                  pageSize={sources.pageSize}
                  basePath={`/categories/${meta.slug}`}
                  query={query}
                />
              </>
            ) : (
              <EmptyState
                icon={PackageOpen}
                title="لا توجد مصادر مطابقة"
                description={
                  hasFilters
                    ? "لا يوجد مصدر في هذا النظام يجمع بين المهمة واللغة المختارتين. جرّب إزالة فلتر اللغة، أو اختر مهمة أخرى."
                    : "لم تُنشر بعد مصادر لهذا النظام. يمكنك تصفح بقية الأنظمة أو البحث في كل المصادر."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {hasFilters ? (
                      <Link
                        href={`/categories/${meta.slug}`}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-extrabold text-background transition-opacity hover:opacity-90"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        إعادة تعيين الفلاتر
                      </Link>
                    ) : null}
                    <Link
                      href="/sources"
                      className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                    >
                      كل المصادر
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </section>

      {/* Related systems */}
      <section className="border-t border-line bg-surface-sunken/40 py-8">
        <div className="container-page">
          <h2 className="text-sm font-extrabold text-white">أنظمة قريبة</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedSystems.map((system) => (
              <Link
                key={system.slug}
                href={systemHref(system.value)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                <CatalogIcon name={system.icon} className="h-3.5 w-3.5 text-accent-400" />
                {system.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
