/**
 * File: lib/seo.ts
 * Purpose: Single source of truth for Phase 5 SEO: site constants, real
 * database statistics used in meta descriptions, Metadata builders and
 * Schema.org JSON-LD generators.
 *
 * All counts come from PostgreSQL via Prisma. `getSeoStats` is wrapped in
 * React `cache()` so a page and its `generateMetadata` share one query per
 * request.
 */

import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "./db";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "بوابة مصادر السيارات التونسية";
export const SITE_NAME_SHORT = "بوابة المصادر";
export const SITE_LOCALE = "ar_TN";
export const SITE_LANG = "ar";
export const SITE_TWITTER = "@tunisianautosrc";

/**
 * Social sharing card (F-03). The PNG is generated from
 * `app/opengraph-image.tsx` and committed once to `public/og-image.png`, so
 * every route can reference the same static, cacheable 1200×630 asset.
 */
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "بوابة مصادر السيارات التونسية — دليل تشخيص وإصلاح السيارات",
};

export const SITE_DESCRIPTION =
  "دليل عملي لمصادر تشخيص وإصلاح السيارات، مخصص لميكانيكيي الورشات التونسية: " +
  "أدلة إصلاح، أكواد أعطال OBD-II، مخططات كهربائية، وبرامج تشخيص.";

export interface SeoStats {
  sources: number;
  liveSources: number;
  systems: number;
  tasks: number;
  obdCodes: number;
  lastUpdated: string | null;
}

/**
 * Real catalogue statistics. Falls back to zeros only if the database is
 * unreachable, so a transient outage never breaks metadata rendering.
 */
export const getSeoStats = cache(async (): Promise<SeoStats> => {
  try {
    const [sources, liveSources, systems, tasks, obdCodes, latest] =
      await Promise.all([
        prisma.source.count({ where: { is_hidden: false } }),
        prisma.source.count({ where: { link_status: "LIVE", is_hidden: false } }),
        prisma.source.groupBy({ by: ["category_system"], where: { is_hidden: false } }),
        prisma.source.groupBy({ by: ["category_task"], where: { is_hidden: false } }),
        prisma.obdCode.count(),
        prisma.source.aggregate({ _max: { updated_at: true }, where: { is_hidden: false } }),
      ]);

    return {
      sources,
      liveSources,
      systems: systems.length,
      tasks: tasks.length,
      obdCodes,
      lastUpdated: latest._max.updated_at
        ? new Date(latest._max.updated_at).toISOString()
        : null,
    };
  } catch (error) {
    console.error("[seo] Could not read catalogue statistics:", error);
    return {
      sources: 0,
      liveSources: 0,
      systems: 0,
      tasks: 0,
      obdCodes: 0,
      lastUpdated: null,
    };
  }
});

/** Homepage/meta sentence built from the real counts. */
export function catalogueSummary(stats: SeoStats): string {
  if (stats.sources === 0 && stats.obdCodes === 0) {
    return SITE_DESCRIPTION;
  }
  return (
    `دليل شامل لمصادر تشخيص وإصلاح السيارات في تونس. ` +
    `أكثر من ${stats.sources} مصدر متخصص + ${stats.obdCodes} كود OBD-II ` +
    `+ ${stats.systems} أنظمة وأدوات تفاعلية للورشات.`
  );
}

export interface BuildMetadataInput {
  title: string;
  description: string;
  /** Canonical path, always starting with `/`. */
  path: string;
  keywords?: string[];
  type?: "website" | "article";
  noIndex?: boolean;
  /** Bypass the root layout title template. */
  absoluteTitle?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

/** Builds a complete, consistent Metadata object for any route. */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const path = input.path === "/" ? "/" : input.path.replace(/\/$/, "");
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const noIndex = input.noIndex ?? false;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: path,
      // The portal is Arabic-first. `ar-TN` is the primary locale, `ar` is the
      // generic fallback and `x-default` covers unmatched languages.
      languages: {
        "ar-TN": path,
        ar: path,
        "x-default": path,
      },
    },
    openGraph: {
      type: input.type ?? "website",
      locale: SITE_LOCALE,
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      images: [OG_IMAGE],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [OG_IMAGE_PATH],
    },
    robots: noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

/* ────────────────────────────────────────────────────────────────
 * Schema.org JSON-LD builders
 * ──────────────────────────────────────────────────────────────── */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: SITE_DESCRIPTION,
    areaServed: { "@type": "Country", name: "Tunisia" },
    knowsLanguage: ["ar", "fr"],
  };
}

export function websiteJsonLd(stats: SeoStats) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: "Tunisian Automotive Sources Portal",
    description: catalogueSummary(stats),
    inLanguage: SITE_LANG,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function datasetJsonLd(
  stats: SeoStats,
  categories: Array<{ value: string; count: number }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${SITE_URL}/#dataset`,
    name: "دليل مصادر تشخيص وإصلاح السيارات في تونس",
    description:
      `قاعدة بيانات تحريرية تضم ${stats.sources} مصدراً متخصصاً و` +
      `${stats.obdCodes} كود OBD-II، مصنّفة حسب ${stats.systems} أنظمة ` +
      `و${stats.tasks} مهام ورشة.`,
    url: SITE_URL,
    inLanguage: ["ar", "fr"],
    isAccessibleForFree: true,
    license: `${SITE_URL}/about`,
    creator: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    spatialCoverage: { "@type": "Place", name: "Tunisia" },
    temporalCoverage: stats.lastUpdated
      ? `${stats.lastUpdated.slice(0, 10)}/..`
      : undefined,
    keywords: [
      "مصادر السيارات",
      "تشخيص السيارات",
      "أكواد OBD-II",
      "إصلاح السيارات",
      "تونس",
      "automotive repair",
    ],
    variableMeasured: categories.map((category) => ({
      "@type": "PropertyValue",
      name: category.value,
      value: category.count,
    })),
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/html",
        contentUrl: SITE_URL,
      },
    ],
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function itemListJsonLd(
  name: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${item.path}`,
    })),
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "TechArticle";
}) {
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "WebPage",
    "@id": `${SITE_URL}${input.path === "/" ? "" : input.path}#webpage`,
    url: `${SITE_URL}${input.path === "/" ? "" : input.path}`,
    name: input.name,
    description: input.description,
    inLanguage: SITE_LANG,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function techArticleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  modifiedTime?: string;
  keywords?: string[];
}) {
  return {
    ...webPageJsonLd({
      name: input.headline,
      description: input.description,
      path: input.path,
      type: "TechArticle",
    }),
    headline: input.headline,
    ...(input.modifiedTime ? { dateModified: input.modifiedTime } : {}),
    ...(input.keywords ? { keywords: input.keywords } : {}),
    author: { "@id": ORGANIZATION_ID },
  };
}

export function howToJsonLd(input: {
  name: string;
  description: string;
  path: string;
  steps: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${SITE_URL}${input.path}#howto`,
    name: input.name,
    description: input.description,
    inLanguage: SITE_LANG,
    totalTime: "PT10M",
    step: input.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
  };
}

export function faqJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Visible FAQ copy; the same array feeds FAQPage JSON-LD. */
export const FAQ_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: "كيف أجد المصدر المناسب لعطل في سيارتي؟",
    answer:
      "ابدأ من صفحة التصنيفات واختر النظام الذي تعمل عليه (المحرك، الكهرباء، التعليق…). " +
      "يمكنك أيضاً كتابة الكود أو اسم العطل في البحث الفوري، أو استعمال أداة التشخيص الموجّه " +
      "إذا لم تكن تعرف النظام.",
  },
  {
    question: "هل أكواد OBD-II الموجودة في المنصة كافية للتشخيص؟",
    answer:
      "الأكواد تعطيك الدائرة المتأثرة وليست القطعة التالفة بحد ذاتها. اقرأ الكود، ثم راجع " +
      "الأسباب وخطوات الفحص المرتّبة، وادعم القرار بقراءة بيانات التجميد (Freeze Frame) " +
      "وقياسات الجهاز قبل استبدال أي قطعة.",
  },
  {
    question: "هل مصادر المنصة مجانية؟",
    answer:
      "الدليل نفسه مجاني. بعض المصادر التي نرشّحها مجانية بالكامل، وبعضها يتطلب حساباً أو " +
      "اشتراكاً. نذكر حالة الرابط واللغة والملاحظات حتى تعرف ما تحتاجه قبل فتح المصدر.",
  },
  {
    question: "كيف أقترح مصدراً جديداً أو أبلّغ عن رابط لا يعمل؟",
    answer:
      "استعمل صفحة «أضف مصدراً» لإرسال الاقتراح مع الرابط والوصف. تراجع الفريق اليدوياً، " +
      "ويمكنك متابعة الحالة برقم التتبّع. للإبلاغ عن رابط معطّل استعمل نموذج التواصل في " +
      "صفحة «عن المنصة».",
  },
  {
    question: "هل تعمل المنصة على الهاتف داخل الورشة؟",
    answer:
      "نعم، الواجهة عربية RTL ومصمّمة أولاً للهاتف: بحث فوري، فلاتر كبيرة، وتباين عالٍ " +
      "يناسب الإضاءة المنخفضة. يمكنك أيضاً حفظ المصادر ومقارنتها وطباعة ورقة عمل.",
  },
];
