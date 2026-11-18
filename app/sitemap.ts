/**
 * File: app/sitemap.ts
 * Purpose: Dynamic sitemap generated from PostgreSQL. Covers static pages,
 * the ten system categories and their guides, every published source and
 * every OBD-II code.
 *
 * Phase 5 · Task 3: rendered per request so hiding a source in the admin
 * console removes it immediately. The CDN still caches the response through
 * the s-maxage header set in next.config.mjs, so crawlers are not penalised.
 */

import type { MetadataRoute } from "next";
import { SYSTEM_META } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Static marketing/utility routes that should always be indexed. */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.9 },
  { path: "/sources", changeFrequency: "weekly", priority: 0.9 },
  { path: "/obd-codes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tools/diagnosis", changeFrequency: "weekly", priority: 0.8 },
  { path: "/how-to-use", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contribute", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sources, obdCodes, latest] = await Promise.all([
    prisma.source.findMany({
      where: { is_hidden: false },
      select: { id: true, updated_at: true },
      orderBy: { id: "asc" },
    }),
    prisma.obdCode.findMany({
      select: { code: true },
      orderBy: { code: "asc" },
    }),
    prisma.source.aggregate({ _max: { updated_at: true }, where: { is_hidden: false } }),
  ]);

  // OBD rows have no timestamp column; use the newest catalogue update.
  const contentDate = latest._max.updated_at
    ? new Date(latest._max.updated_at)
    : new Date();

  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified: contentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = SYSTEM_META.map((system) => ({
    url: `${SITE_URL}/categories/${system.slug}`,
    lastModified: contentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const guideRoutes: MetadataRoute.Sitemap = SYSTEM_META.map((system) => ({
    url: `${SITE_URL}/categories/${system.slug}/guide`,
    lastModified: contentDate,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const sourceRoutes: MetadataRoute.Sitemap = sources.map((source) => ({
    url: `${SITE_URL}/sources/${source.id}`,
    lastModified: new Date(source.updated_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const obdRoutes: MetadataRoute.Sitemap = obdCodes.map((code) => ({
    url: `${SITE_URL}/obd-codes/${code.code}`,
    lastModified: contentDate,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...guideRoutes,
    ...sourceRoutes,
    ...obdRoutes,
  ];
}
