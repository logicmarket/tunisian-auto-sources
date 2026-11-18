/**
 * File: app/sources/page.tsx
 * Purpose: Full source browser with URL-driven filters (system, task,
 * language), three sort modes, and server-rendered pagination. This is the
 * destination for "عرض الكل" and every task/language badge.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, PackageOpen, SlidersHorizontal, Star } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Pagination } from "@/components/ui/Pagination";
import { SourceCard } from "@/components/ui/SourceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getLanguageSlug,
  getSystemMeta,
  getTaskMeta,
  resolveLanguageParam,
  resolveSystemParam,
  resolveTaskParam,
} from "@/lib/catalog";
import { getCategoryCounts, getSourcesPage } from "@/lib/queries";
import { firstParam, parsePage, parseSort } from "@/lib/params";
import {
  breadcrumbJsonLd,
  buildMetadata,
  getSeoStats,
  itemListJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import type { SourceSort } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SourcesPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({
  searchParams,
}: SourcesPageProps): Promise<Metadata> {
  const stats = await getSeoStats();
  const filtered = Boolean(
    firstParam(searchParams.system) ||
      firstParam(searchParams.task) ||
      firstParam(searchParams.language) ||
      firstParam(searchParams.status) ||
      firstParam(searchParams.page),
  );

  return buildMetadata({
    title: "كل المصادر",
    description:
      `استعرض ${stats.sources} مصدراً لتشخيص وإصلاح السيارات، منها ` +
      `${stats.liveSources} رابطاً نشطاً، مع فلاتر حسب النظام والمهمة واللغة ` +
      `وترتيب حسب التقييم أو الأحدث.`,
    path: "/sources",
    noIndex: filtered,
    keywords: [
      "كل المصادر",
      "مصادر السيارات",
      "أدلة الإصلاح",
      "مخططات كهربائية",
      "برامج تشخيص",
    ],
  });
}

const SORT_OPTIONS: Array<{ value: SourceSort; label: string; icon: typeof Star }> = [
  { value: "rating", label: "الأعلى تقييماً", icon: Star },
  { value: "latest", label: "الأحدث إضافة", icon: Clock3 },
  { value: "name", label: "أبجدياً", icon: SlidersHorizontal },
];

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const systemSlug = firstParam(searchParams.system);
  const taskSlug = firstParam(searchParams.task);
  const languageSlug = firstParam(searchParams.language);
  const pageParam = parsePage(searchParams.page);
  const sort = parseSort(searchParams.sort);

  const systemValue = resolveSystemParam(systemSlug);
  const taskValue = resolveTaskParam(taskSlug);
  const languageValue = resolveLanguageParam(languageSlug);

  const activeSystemSlug = getSystemMeta(systemValue)?.slug;
  const activeTaskSlug = getTaskMeta(taskValue)?.slug;
  const activeLanguageSlug = languageValue
    ? getLanguageSlug(languageValue)
    : undefined;
  const activeCount = [
    activeSystemSlug,
    activeTaskSlug,
    activeLanguageSlug,
  ].filter(Boolean).length;

  const [categories, sources] = await Promise.all([
    getCategoryCounts(),
    getSourcesPage(
      {
        system: systemValue,
        task: taskValue,
        language: languageValue,
      },
      pageParam,
      12,
      sort,
    ),
  ]);

  const systemMeta = getSystemMeta(systemValue);
  const headline = systemMeta ? `مصادر ${systemMeta.label}` : "كل المصادر";

  function sortHref(nextSort: SourceSort): string {
    const params = new URLSearchParams();
    if (activeSystemSlug) params.set("system", activeSystemSlug);
    if (activeTaskSlug) params.set("task", activeTaskSlug);
    if (activeLanguageSlug) params.set("language", activeLanguageSlug);
    if (nextSort !== "rating") params.set("sort", nextSort);
    const query = params.toString();
    return query ? `/sources?${query}` : "/sources";
  }

  const query = {
    system: activeSystemSlug,
    task: activeTaskSlug,
    language: activeLanguageSlug,
    sort: sort === "rating" ? undefined : sort,
  };

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "كل المصادر",
            description:
              "فهرس كامل لمصادر تشخيص وإصلاح السيارات مع الفلاتر والترتيب.",
            path: "/sources",
            type: "CollectionPage",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "كل المصادر", path: "/sources" },
          ]),
          itemListJsonLd(
            "مصادر السيارات",
            sources.items.map((source) => ({
              name: source.name,
              path: `/sources/${source.id}`,
            })),
          ),
        ]}
      />
      <section className="border-b border-line/60 bg-surface-sunken/30">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "المصادر", href: "/sources" },
              ...(systemMeta ? [{ label: systemMeta.label }] : []),
            ]}
          />

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
                قاعدة المصادر
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {headline}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                {formatNumber(sources.total)} مصدراً مطابقاً. اضغط على أي بطاقة
                لرؤية التفاصيل، أو افتح المصدر مباشرة في تبويب جديد.
              </p>
            </div>

            {activeCount > 0 ? (
              <Link
                href="/sources"
                className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                مسح {formatNumber(activeCount)} فلتر
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <FilterPanel
              basePath="/sources"
              systems={categories.systems}
              tasks={categories.tasks}
              languages={categories.languages}
              active={{
                system: activeSystemSlug,
                task: activeTaskSlug,
                language: activeLanguageSlug,
              }}
              showSystem
              preserve={{ sort: sort === "rating" ? undefined : sort }}
            />
          </div>

          <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                عرض{" "}
                <span className="font-bold tabular-nums text-muted-strong">
                  {formatNumber(sources.items.length)}
                </span>{" "}
                من{" "}
                <span className="font-bold tabular-nums text-muted-strong">
                  {formatNumber(sources.total)}
                </span>{" "}
                مصدر
              </p>

              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="ترتيب النتائج"
              >
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = sort === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={sortHref(option.value)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors",
                        selected
                          ? "border-accent bg-accent text-background"
                          : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {sources.items.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sources.items.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>

                <Pagination
                  currentPage={sources.page}
                  totalPages={sources.totalPages}
                  totalItems={sources.total}
                  pageSize={sources.pageSize}
                  basePath="/sources"
                  query={query}
                />
              </>
            ) : (
              <EmptyState
                icon={PackageOpen}
                title="لا توجد مصادر مطابقة"
                description="لا يوجد مصدر يجمع كل الفلاتر المختارة. جرّب إزالة فلتر اللغة أو النظام، أو ابحث بالاسم مباشرة."
                action={
                  <Link
                    href="/sources"
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-extrabold text-background transition-opacity hover:opacity-90"
                  >
                    إعادة تعيين الفلاتر
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
