/**
 * File: app/search/page.tsx
 * Purpose: Full search results page. Results are grouped into sources,
 * categories, and OBD codes, matching the header overlay so the experience
 * stays consistent. The overlay handles instant previews; this page handles
 * the complete answer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  ScanLine,
  Search,
  SearchX,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CatalogIcon } from "@/components/ui/CatalogIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { SourceCard } from "@/components/ui/SourceCard";
import { getSystemMeta, getTaskMeta } from "@/lib/catalog";
import { getObdCategoryLabel } from "@/lib/labels";
import { searchPortal } from "@/lib/search-portal";
import { firstParam } from "@/lib/params";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const SUGGESTIONS = [
  "P0300",
  "كهرباء",
  "حساس الأكسجين",
  "زيت ناقل الحركة",
  "ECU",
  "فرامل",
  "مخططات كهربائية",
  "قطع غيار",
];

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = firstParam(searchParams.q);

  return buildMetadata({
    title: query ? `البحث: ${query}` : "البحث",
    description: query
      ? `نتائج البحث عن «${query}» في مصادر السيارات والتصنيفات وأكواد OBD.`
      : "ابحث في مصادر السيارات والتصنيفات وأكواد OBD.",
    path: "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = firstParam(searchParams.q) ?? "";
  const canSearch = query.trim().length >= 2;

  const results = canSearch
    ? await searchPortal(query, {
        sourceLimit: 48,
        categoryLimit: 12,
        obdLimit: 20,
      })
    : null;

  const total = results?.total ?? 0;

  return (
    <main id="main" className="flex-1">
      <section className="border-b border-line/60 bg-surface-sunken/30">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={[{ label: "البحث" }]} />

          <div className="mt-4 max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
              بحث شامل
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {query ? `نتائج «${query}»` : "ابحث في المنصة"}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              ابحث بالعربية أو الإنجليزية، أو أدخل كود عطل مباشرة. النتائج
              تشمل المصادر والتصنيفات وأكواد OBD.
            </p>
          </div>

          <div className="mt-5 max-w-2xl">
            <SearchBar
              defaultValue={query}
              inputId="search-page-input"
              showSuggestions={false}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        {!canSearch ? (
          <EmptyState
            icon={Search}
            title="اكتب حرفين على الأقل"
            description="جرّب اسم نظام مثل «كهرباء»، أو مهمة مثل «برمجة ECU»، أو كود عطل مثل P0300."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.slice(0, 6).map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                  >
                    <Search className="h-3 w-3 text-accent-400" aria-hidden="true" />
                    {term}
                  </Link>
                ))}
              </div>
            }
          />
        ) : total === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`لا توجد نتائج عن «${query}»`}
            description="تحقق من الإملاء، أو استخدم كلمة أقصر، أو ابحث بكود العطل. يمكنك أيضاً تصفح الأنظمة مباشرة."
            action={
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.slice(0, 5).map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${encodeURIComponent(term)}`}
                      className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/categories"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-extrabold text-background transition-opacity hover:opacity-90"
                >
                  تصفّح التصنيفات
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            }
          />
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="text-xs text-muted">عدد النتائج:</span>
              <span className="text-sm font-extrabold tabular-nums text-white">
                {formatNumber(total)}
              </span>
              <span className="h-4 w-px bg-line" aria-hidden="true" />
              <span className="text-[11px] text-muted">
                {formatNumber(results?.sources.length ?? 0)} مصدر ·{" "}
                {formatNumber(results?.categories.length ?? 0)} تصنيف ·{" "}
                {formatNumber(results?.obd.length ?? 0)} كود
              </span>
            </div>

            {results && results.categories.length > 0 ? (
              <section aria-labelledby="search-categories">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  <h2
                    id="search-categories"
                    className="text-lg font-extrabold text-white"
                  >
                    التصنيفات
                  </h2>
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted">
                    {results.categories.length}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.categories.map((category) => {
                    const meta =
                      category.kind === "system"
                        ? getSystemMeta(category.value)
                        : getTaskMeta(category.value);
                    const icon = meta?.icon ?? "layers";

                    return (
                      <Link
                        key={`${category.kind}-${category.slug}`}
                        href={category.href}
                        className="surface-card group flex items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20 transition-colors group-hover:bg-accent group-hover:text-background">
                          <CatalogIcon name={icon} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-white">
                              {category.label}
                            </span>
                            <span className="text-[10px] font-bold tabular-nums text-muted">
                              {formatNumber(category.count)}
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[11px] leading-5 text-muted">
                            {category.description}
                          </span>
                          <span className="mt-1.5 block text-[10px] font-semibold text-accent-300/80">
                            {category.kind === "system" ? "نظام سيارة" : "نوع مهمة"}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {results && results.sources.length > 0 ? (
              <section aria-labelledby="search-sources">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  <h2
                    id="search-sources"
                    className="text-lg font-extrabold text-white"
                  >
                    المصادر
                  </h2>
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted">
                    {results.sources.length}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.sources.map((source) => (
                    <SourceCard key={source.id} source={source} compact />
                  ))}
                </div>
              </section>
            ) : null}

            {results && results.obd.length > 0 ? (
              <section aria-labelledby="search-obd">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  <h2 id="search-obd" className="text-lg font-extrabold text-white">
                    أكواد OBD
                  </h2>
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted">
                    {results.obd.length}
                  </span>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {results.obd.map((code) => (
                    <Link
                      key={code.code}
                      href={`/obd-codes/${code.code}`}
                      className="surface-card group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35"
                    >
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.07] font-mono text-[11px] font-extrabold text-accent-300" dir="ltr">
                        {code.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">
                          {code.name_ar ?? "كود عطل"}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted">
                          {code.system_category ?? getObdCategoryLabel(code.category)}
                        </span>
                      </span>
                      <ArrowLeft
                        className="h-3.5 w-3.5 shrink-0 text-muted/50 transition-colors group-hover:text-accent-300"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
