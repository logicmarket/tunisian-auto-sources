# SEO & Performance — Implementation Notes (Task 2)

## 1. Data snapshot used for SEO (Neon, read-only)

| Query | Result |
| --- | ---: |
| `COUNT(*) FROM sources` | 141 |
| `COUNT(DISTINCT category_system)` | 9 |
| `COUNT(*) FROM obd_codes` | 442 |
| `COUNT(*) FROM sources WHERE updated_at IS NOT NULL` | 141 |
| `COUNT(*) FROM sources WHERE link_status = 'LIVE'` | 72 |

Category distribution (feeds the `Dataset.variableMeasured` graph):

| System | Sources |
| --- | ---: |
| General / Multi-system | 76 |
| Electrical & Electronics | 31 |
| Diagnostics | 17 |
| Engine | 9 |
| Transmission | 4 |
| Fuel & Injection | 1 |
| Body & Paint | 1 |
| Exhaust & Emissions | 1 |
| Cooling & AC | 1 |

## 2. Metadata

`lib/seo.ts` exposes `buildMetadata()` which every route uses. It produces:

* canonical URL (`alternates.canonical`)
* hreflang (`ar-TN`, `ar`, `x-default`)
* Open Graph (`locale: ar_TN`, url, siteName, title, description)
* Twitter card
* robots policy (`index/follow`, `max-image-preview: large`, `max-snippet: -1`)
* optional `noIndex` for filtered/private pages

`SITE_URL` comes from `NEXT_PUBLIC_SITE_URL`; `metadataBase` is set once in
`app/layout.tsx`, so relative canonical paths resolve correctly.

### Per-route metadata

| Route | Title strategy | Data used |
| --- | --- | --- |
| `/` | absolute title with source + OBD counts | `getSeoStats()` |
| `/categories` | fixed + counts | `getSeoStats()` |
| `/categories/[system]` | system label | `SYSTEM_META` |
| `/categories/[system]/guide` | guide title | `lib/guides` |
| `/sources` | fixed + counts, `noIndex` when filtered | `getSeoStats()` |
| `/sources/[id]` | source name, `article` OG, `modifiedTime` | source row |
| `/obd-codes` | fixed + OBD count | `getSeoStats()` |
| `/obd-codes/[code]` | `CODE — Arabic name`, `article` OG | code row |
| `/tools/diagnosis` | fixed | static |
| `/about`, `/how-to-use`, `/contribute` | fixed | static |
| `/search` | query-aware, always `noIndex` | query |
| `/admin/*`, `/my-sources`, `/contribute/status/*` | `noIndex` | — |

## 3. Schema.org JSON-LD

| Graph | Where | Notes |
| --- | --- | --- |
| `Organization` | root layout | `@id` anchor, Tunisia area, ar/fr |
| `WebSite` + `SearchAction` | root layout | site search target |
| `Dataset` | homepage | real counts + per-system `variableMeasured` |
| `ItemList` | homepage, categories, sources, OBD directory | ordered links |
| `FAQPage` | homepage | matches the visible `FaqSection` |
| `BreadcrumbList` | all inner pages | mirrors visible breadcrumbs |
| `CollectionPage` | categories, sources, OBD directory | |
| `WebPage` / `AboutPage` | source detail, about, how-to, contribute | |
| `TechArticle` | OBD code detail, system guides | |
| `HowTo` | OBD code detail (diagnosis steps), diagnosis tool | steps from DB |

All graphs are emitted through `components/seo/JsonLd.tsx`, which escapes
`<` to `\u003c` before injection.

## 4. Sitemap

`app/sitemap.ts` reads PostgreSQL directly through Prisma:

* `sources`: `id`, `updated_at`
* `obd_codes`: `code` (no timestamp column → newest source `updated_at`)
* static routes + 10 taxonomy categories + 10 guides

Expected entry count:

```text
8 static + 10 categories + 10 guides + 141 sources + 442 OBD = 611
```

Verified against the live build: `grep -c '<loc>' sitemap.xml` → **611**
(442 OBD + 141 sources + 10 categories + 10 guides + 8 static).

Excluded: `/search`, `/my-sources`, `/admin/*`, `/contribute/status/*`,
`/api/*` (also disallowed in robots).

`revalidate = 3600` and a CDN `Cache-Control` of
`public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`.

## 5. robots.txt

```text
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /search
Disallow: /my-sources
Disallow: /contribute/status/
Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL}
```

## 6. Fonts & images

* Cairo (Arabic + Latin) and Inter are already loaded with `next/font/google`,
  `display: swap`, self-hosted at build time, CSS variables, and explicit
  `preload: true`.
* The UI has **no raster images** (icons are inline SVG from `lucide-react`),
  so there is nothing to convert to `next/image` today. `next.config.mjs`
  enables AVIF/WebP, a 24 h `minimumCacheTTL`, and explicit device/image sizes
  so any future `<Image>` is optimised by default.

## 7. Caching

| Layer | Policy |
| --- | --- |
| Content pages | `revalidate = 3600` (ISR) |
| `/sources` (filtered), `/search` | request-rendered, `noIndex` |
| `/api/sources`, `/api/sources/batch`, `/api/sources/search`, `/api/search`, `/api/diagnosis/codes` | `public, s-maxage=300, stale-while-revalidate=600` |
| `/api/categories`, `/api/sources/[id]`, `/api/diagnosis/codes/[code]` | `public, s-maxage=3600, stale-while-revalidate=86400` |
| `/api/sources/[id]/rating`, `/api/sources/[id]/rate` GET | `public, s-maxage=60, stale-while-revalidate=120` |
| Writes, admin, tracking, contribute checks | `no-store` (unchanged) |
| `/_next/static/*` | immutable (Next.js default) |

## 8. Core Web Vitals measures

* **LCP** — no hero image; the hero heading is text and uses the preloaded
  Cairo variable font. Font `display: swap` prevents invisible text.
* **CLS** — all existing layout boxes keep fixed heights; new FAQ uses
  `<details>` (no layout shift on open because it pushes content below).
* **INP** — search remains debounced/client-side; API reads are CDN-cached.
* **Compression** — `compress: true` (gzip/brotli at the platform level).
* **Third-party scripts** — none added.

## 9. Accessibility / SEO safety

* `html lang="ar" dir="rtl"` unchanged.
* Every page keeps one `<h1>`.
* JSON-LD is additive; no visible content was removed.
* Filtered `/sources` pages are `noindex` to avoid duplicate crawl paths.

## 10. Verified results (live build, Neon data)

Build: `npm run build` against Neon, `NODE_OPTIONS=--max-old-space-size=4096`.
Result: **exit 0**, 18 static pages generated, no type or lint errors.

| Check | Command | Result |
| --- | --- | --- |
| `/sitemap.xml` | `curl -s .../sitemap.xml \| grep -c "<loc>"` | **611** URLs, `application/xml` |
| `/robots.txt` | `curl -s .../robots.txt` | 5 `Disallow` rules + `Sitemap` + `Host` |
| Homepage JSON-LD | `grep -o 'application/ld+json'` | 3 blocks: `Organization`, `WebSite`+`SearchAction`, `Dataset`+`ItemList`+`FAQPage` |
| JSON-LD validity | `JSON.parse` on every block, 13 routes | **26/26 blocks valid** |
| Canonical | `<link rel="canonical">` | present on every route |
| hreflang | `<link rel="alternate" hreflang>` | `ar-TN`, `ar`, `x-default` |
| Title with real counts | `<title>` | `… 141 مصادر و442 كود OBD-II` |
| Filtered listing | `/sources?system=engine` | `robots: noindex, follow` |
| Search page | `/search?q=engine` | `robots: noindex, follow` |
| Missing OBD code | `/obd-codes/ZZZZZ` | `robots: noindex, follow` (soft-404 mitigation) |
| API cache (catalogue) | `/api/sources` | `public, s-maxage=300, stale-while-revalidate=600` |
| API cache (reference) | `/api/categories` | `public, s-maxage=3600, stale-while-revalidate=86400` |

Route-level JSON-LD graph coverage:

| Route | Graphs |
| --- | --- |
| `/` | Organization, WebSite, SearchAction, Dataset, ItemList, FAQPage |
| `/categories`, `/sources`, `/obd-codes` | CollectionPage, BreadcrumbList, ItemList |
| `/categories/[system]` | CollectionPage, BreadcrumbList, ItemList |
| `/categories/[system]/guide` | TechArticle, BreadcrumbList |
| `/sources/[id]` | WebPage, BreadcrumbList |
| `/obd-codes/[code]` | TechArticle, HowTo, BreadcrumbList |
| `/tools/diagnosis` | WebPage, HowTo, BreadcrumbList |
| `/about`, `/how-to-use`, `/contribute` | WebPage/AboutPage, BreadcrumbList |

## 11. Known limitations / findings

1. **Soft 404 on invalid dynamic ids (pre-existing, F-02).** Because
   `app/loading.tsx` opens a root Suspense boundary, Next.js flushes the shell
   with HTTP 200 before `notFound()` runs, so `/obd-codes/ZZZZZ` and
   `/sources/999999` return **200 + not-found UI** instead of 404. The same
   behaviour exists in the untouched Phase-4 build, so Task 2 did not introduce
   it. Mitigation applied: `generateMetadata` emits `robots: noindex, follow`
   for missing records, which is the recommended treatment for a soft 404.
   A hard fix requires removing the root `loading.tsx` (or moving it below the
   detail routes), which is a UX change outside this task.
2. **`/obd-codes` is request-rendered.** The directory reads
   `searchParams.category`, so Next.js reports
   `Static generation failed due to dynamic usage on /obd-codes`. That is the
   intended behaviour for a filtered listing; it stays indexable because the
   canonical URL is the unfiltered one.
3. **Sitemap `Cache-Control` is doubled.** Next.js appends
   `public, max-age=0, must-revalidate` to the metadata route, so the served
   header is
   `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400, public, max-age=0, must-revalidate`.
   Shared caches still honour `s-maxage=86400`; browsers revalidate. The header
   in `next.config.mjs` is kept because it is what controls the CDN layer.
4. **`NEXT_PUBLIC_SITE_URL` is inlined at build time.** Rebuild (or use a
   build-time env) when the production domain changes; the canonical/hreflang
   URLs and the sitemap all derive from it.
5. **`link_reports` still absent from Neon (F-01).** Unrelated to SEO; no SEO
   route or JSON-LD graph references that table.
6. **No Open Graph image asset yet.** `twitter.card` is declared as
   `summary_large_image` and `openGraph` carries title/description/locale, but
   `public/` contains no raster asset, so social platforms fall back to a
   text-only card. Follow-up: add a 1200x630 `public/og-image.png` (Arabic
   headline + brand mark) and reference it from `buildMetadata()` and
   `app/layout.tsx` via `openGraph.images` / `twitter.images`. Arabic text
   cannot be rendered safely by `next/og`/satori (no Arabic shaping), so the
   asset should be designed once rather than generated per request.
