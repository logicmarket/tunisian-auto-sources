/**
 * File: app/categories/page.tsx
 * Purpose: Category directory. Shows the ten vehicle systems first, then
 * all task types and languages. Every card links to a pre-filtered list so
 * a mechanic can reach a short, relevant set in one tap.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Layers, Languages, Wrench } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SystemGrid } from "@/components/home/SystemGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { CatalogIcon } from "@/components/ui/CatalogIcon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  SYSTEM_META,
  TASK_META,
  languageHref,
  sourceCountLabel,
  systemHref,
  taskHref,
} from "@/lib/catalog";
import { getLanguageLabel } from "@/lib/labels";
import { getCategoryCounts } from "@/lib/queries";
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
    title: "التصنيفات",
    description:
      `تصفّح ${stats.sources} مصدراً موزّعة على ${stats.systems} أنظمة ` +
      `و${stats.tasks} مهام: المحرك، الكهرباء، الناقل، التبريد، التشخيص، ` +
      `الإصلاح والبرمجة.`,
    path: "/categories",
    keywords: [
      "تصنيفات السيارات",
      "أنظمة السيارات",
      "مهام الورشة",
      "مصادر التشخيص",
      "إصلاح السيارات تونس",
    ],
  });
}

export default async function CategoriesPage() {
  const categories = await getCategoryCounts();
  const taskCount = new Map(categories.tasks.map((item) => [item.value, item.count]));
  const languageCount = new Map(
    categories.languages.map((item) => [item.value, item.count]),
  );

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "التصنيفات",
            description:
              "دليل تصنيفات مصادر السيارات حسب النظام ومهام الورشة.",
            path: "/categories",
            type: "CollectionPage",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "التصنيفات", path: "/categories" },
          ]),
          itemListJsonLd(
            "أنظمة السيارات",
            SYSTEM_META.map((system) => ({
              name: system.label,
              path: `/categories/${system.slug}`,
            })),
          ),
        ]}
      />

      <section className="border-b border-line/60 bg-surface-sunken/30">
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs items={[{ label: "التصنيفات" }]} />

          <div className="mt-5 max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
              خريطة المصادر
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              التصنيفات
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted sm:text-base sm:leading-8">
              كل مصدر مصنّف بنظامين: <strong className="text-muted-strong">نظام السيارة</strong>{" "}
              الذي يغطيه، و<strong className="text-muted-strong">نوع المهمة</strong> التي
              يساعدك فيها. اختر واحداً للبدء، أو اجمع بينهما لاحقاً عبر الفلاتر.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">
              <Layers className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              {formatNumber(categories.total)} مصدر
            </span>
            <span className="chip">
              <Wrench className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              {formatNumber(SYSTEM_META.length)} أنظمة ·{" "}
              {formatNumber(TASK_META.length)} مهام
            </span>
            <span className="chip">
              <Languages className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              {formatNumber(categories.languages.length)} لغات
            </span>
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="التصنيف الرئيسي"
          title="أنظمة السيارات"
          description="عشرة أنظمة تغطي أعمال الورشة اليومية، من الصيانة العامة إلى العادم والانبعاثات."
        />
        <SystemGrid counts={categories.systems} className="mt-7" />

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
          <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
          النظام الذي لا يظهر له عدد قد لا يحتوي مصادر منشورة بعد؛ الصفحة تبقى
          جاهزة لإضافة المصادر مستقبلاً.
        </p>
      </section>

      <section className="border-y border-line bg-surface-sunken/40 py-10 sm:py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="التصنيف الفرعي"
            title="حسب المهمة"
            description="اختر ما تريد فعله بالمصدر: تشخيص العطل، إصلاحه، برمجة وحدة تحكم، أو البحث عن قطعة."
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TASK_META.map((task) => {
              const count = taskCount.get(task.value) ?? 0;
              return (
                <Link
                  key={task.value}
                  href={taskHref(task.value)}
                  className="surface-card group flex items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-accent-glow"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent-300 ring-1 ring-inset ring-line transition-colors group-hover:bg-accent group-hover:text-background">
                    <CatalogIcon name={task.icon} className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-white">
                        {task.label}
                      </span>
                      <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-accent-300">
                        {formatNumber(count)}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-5 text-muted">
                      {task.description}
                    </span>
                    <span className="mt-2 block text-[10px] font-semibold text-muted/70">
                      {sourceCountLabel(count)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="لغة المصدر"
          title="تصفّح حسب اللغة"
          description="بعض المصادر بالعربية، وبعضها بالإنجليزية أو الفرنسية. اختر اللغة التي تقرأها بسرعة."
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.languages.map((language) => (
            <Link
              key={language.value}
              href={languageHref(language.value)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              <Languages className="h-4 w-4 text-accent-400" aria-hidden="true" />
              {getLanguageLabel(language.value)}
              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-muted">
                {formatNumber(languageCount.get(language.value) ?? language.count)}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6 text-[11px] text-muted">
          <span className="font-bold text-muted-strong">أنظمة سريعة:</span>
          {SYSTEM_META.slice(0, 5).map((system) => (
            <Link
              key={system.slug}
              href={systemHref(system.value)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 font-semibold text-muted transition-colors hover:border-accent/40 hover:text-white"
            >
              {system.shortLabel}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
