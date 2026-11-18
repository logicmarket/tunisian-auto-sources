# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-11-18

### Added

- **Link health monitoring**: shared checker engine, append-only `link_reports`
  history (144 rows from the first live sweep), Vercel Cron endpoint, GitHub
  Actions nightly sweep, token-gated admin dashboard (recheck / edit / hide /
  delete / CSV export) and public freshness badges.
- **Automated verification**: `npm run check-links` (dry run) and
  `check-links:write` (persist), with Markdown/JSON reports.
- **SEO**: Prisma-driven sitemap (611 URLs), `robots.txt`, Schema.org graph
  (Organization, WebSite, Dataset, Breadcrumb, ItemList, WebPage, TechArticle,
  HowTo, FAQPage), hreflang `ar-TN`, per-route canonicals and ISR.
- **Open Graph card**: static 1200×630 `public/og-image.png` referenced from
  the root layout and every page metadata builder, plus
  `assets/og-image.html` as the reproducible artwork source.
- **Monitoring**: Sentry (client/server/edge configs, disabled without a DSN)
  and Vercel Analytics.
- **GitHub project files**: CI workflow, issue templates, PR template,
  Dependabot, MIT license, README, branching strategy.

### Fixed

- **Soft 404 (F-02)**: removed `app/loading.tsx`, which opened a root Suspense
  boundary and flushed the shell before `notFound()` ran. Invalid dynamic ids
  now return HTTP 404 instead of 200.
- **Missing social image (F-03)**: added the Open Graph asset and wired
  `og:image` / `twitter:image` into site-wide metadata.
- **Mobile/quality**: corrected root metadata and hidden-source filtering in
  every public query, sitemap and JSON-LD list.

### Changed

- Production database moved to **Neon PostgreSQL 18.7** (`ep-still-bar-b9gonya5`,
  `eu-central-1`); Prisma is the only data layer used by the app.
- `package.json` engines raised to Node `>=22.12.0` (required by Sentry SDK).

## [1.0.0] — 2026-11-16

### Added

- First complete release of the Tunisian Automotive Sources Portal.
- 141 curated automotive repair sources, categorised by system and task.
- 442 OBD-II diagnostic codes with Arabic and English descriptions, causes,
  diagnosis steps and severity.
- Guided diagnosis tool (dual path: OBD code / symptoms) with 38 symptoms and
  116 symptom mappings.
- Personal dashboard: bookmarks, ratings, comparison, PDF export.
- Source submission workflow with admin review.
- Instant Arabic + English search.
- Mobile-first Arabic RTL interface with dark mode.
- SQLite → PostgreSQL migration tooling and verification scripts.
