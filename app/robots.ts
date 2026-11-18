/**
 * File: app/robots.ts
 * Purpose: Crawl policy. Public catalogue pages are open; API, admin,
 * search results and personal/tracking pages are excluded to avoid duplicate
 * or private content being indexed.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/search",
          "/my-sources",
          "/contribute/status/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
