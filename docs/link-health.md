# Link health monitoring — operations guide

Phase 5 · Task 3. Scope: every external `sources.url` in PostgreSQL/Neon.

## 1. Architecture

```text
                    ┌──────────────────────────────┐
  npm run           │ scripts/check-links.ts       │
  check-links:write │  (CLI, dry-run by default)   │
                    └──────────────┬───────────────┘
                                   │ shared engine
                    ┌──────────────▼───────────────┐
  Vercel Cron ────► │ lib/link-health.ts           │ ──► sources.link_status
  /api/cron/...     │  checkLink / checkSources /  │     sources.last_verified
                    │  persistOutcomes             │     link_reports (history)
  GitHub Actions ─► └──────────────┬───────────────┘
                                   │
  /admin/link-health ◄─────────────┘  (reads via /api/admin/link-health)
```

One classification policy, three schedulers, zero duplicated logic.

## 2. Database changes (additive)

Migration: `prisma/migrations/20261117120000_link_health_monitoring/migration.sql`

| Object | Change | Purpose |
| --- | --- | --- |
| `sources.is_hidden` | `BOOLEAN NOT NULL DEFAULT false` + index | Soft-hide a source from public listings, search, sitemap and diagnosis. |
| `link_reports` | new table | Append-only history: one row per check (HTTP status, final URL, error, duration). |
| `link_reports` indexes | `(source_id, checked_at DESC)`, `(link_status, checked_at DESC)`, `(checked_at DESC)` | Queue + dashboard queries. |

`link_reports` cascades on source deletion. No existing column is renamed or
dropped; `sources.url` is never changed by the checker.

Apply:

```bash
npx prisma migrate deploy      # production / Neon
npx prisma generate            # refresh the typed client
```

## 3. Status policy

| Result | Status | Meaning |
| --- | --- | --- |
| `2xx`, final URL equals requested | `LIVE` | Healthy. |
| `2xx`, final URL differs | `REDIRECT` | Healthy but moved; `final_url` records the destination. |
| `404`, `410` | `DEAD` | Confirmed gone (HEAD verified with GET). |
| `401`, `403`, `429`, `451`, `5xx` | `UNKNOWN` | Host answered but blocked the bot or had a server error. **Never auto-deleted.** |
| Timeout, DNS, TLS error | `UNKNOWN` | Transient failure; keep the previous status. |
| `UNVERIFIED` | seed value | Not checked yet. |

The checker sends a descriptive user agent, follows redirects, tries `HEAD`
first and falls back to `GET` for `400/403/404/405/406/409/410/429/5xx`.
Response bodies are cancelled immediately.

## 4. CLI

```bash
npm run check-links                    # dry run (default) + JSON/MD report
npm run check-links:write              # persist status + last_verified + history
npm run check-links:sample             # first 20 links
npm run check-links:strict             # write + exit 1 if any DEAD

# examples
npm run check-links -- --only=dead,unknown
npm run check-links -- --stale-days=7
npm run check-links -- --ids=1,14,22
npm run check-links -- --include-hidden --concurrency=4 --timeout=15000
```

Flags: `--write`, `--dry-run`, `--limit=N`, `--ids=1,2`, `--only=...`
(`live|redirect|unknown|unverified|dead|nonlive|problem`), `--stale-days=N`,
`--include-hidden`, `--concurrency=N` (1–32), `--timeout=MS`, `--report=PATH`,
`--no-report`, `--fail-on-dead`, `--quiet`.

Reports land in `reports/link-health/link-health-<timestamp>.json` and `.md`.
The JSON contains every outcome; the Markdown is the human summary.

`last_verified` is a calendar date (`YYYY-MM-DD`, UTC) for compatibility with
the existing UI. It records the last *check*, including UNKNOWN results.

## 5. Schedulers

### Vercel Cron

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/check-links", "schedule": "0 3 * * *" }] }
```

Set on the Vercel project:

| Variable | Value |
| --- | --- |
| `CRON_SECRET` | long random string (Vercel sends it as `Authorization: Bearer …`) |
| `ADMIN_TOKEN` | long random string (dashboard) |
| `DATABASE_URL` | pooled Neon URL |
| `DIRECT_URL` | direct Neon URL |

The route checks 25 stale links per invocation (max 40) to stay inside the
function duration limit. Increase `?limit=` cautiously. Without `CRON_SECRET`
in production the route returns 401.

### GitHub Actions

`.github/workflows/link-check.yml` runs daily at 03:15 UTC and on demand.

Required repository secrets: `DATABASE_URL`, `DIRECT_URL` (falls back to
`DATABASE_URL`). The workflow uses `contents: read` only — it cannot push to
`main`. Reports are uploaded as a 30-day artifact.

## 6. Admin dashboard

`/admin/link-health` — noindex, not linked publicly.

- Auth: `ADMIN_TOKEN` via `x-admin-token`; the browser keeps it in
  `sessionStorage` (same key as the submissions inbox). In development,
  `dev-admin` is accepted.
- Stats: total, live, redirect, unknown, dead, stale > 7 days, hidden, health %.
- Filters: status, hidden (`exclude` / `only` / `all`), search, sort.
- Row actions:
  - **Recheck** — checks one URL and appends history.
  - **Edit** — URL, manual status, admin note. Changing the URL is an explicit
    operator action; the checker itself never rewrites URLs.
  - **Hide / Show** — soft visibility toggle (`sources.is_hidden`).
  - **Delete** — hard delete; requires `{ "confirm": "DELETE" }` and a browser
    confirmation. Prefer hide.
- Batch: “check 20 broken links” (`DEAD,UNKNOWN,UNVERIFIED`).
- CSV export of the current filter (UTF-8 BOM for Excel).

API:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/link-health` | stats + paginated queue (`status`, `q`, `hidden`, `stale`, `sort`, `page`, `pageSize`) |
| `GET` | `/api/admin/link-health?format=csv` | inventory export (max 200 rows per call) |
| `POST` | `/api/admin/link-health` | `{ "action": "recheck", "ids": [...] }` or `{ "limit": 20, "only": [...] }` |
| `PATCH` | `/api/admin/link-health/:id` | `{ url?, link_status?, is_hidden?, notes? }` |
| `DELETE` | `/api/admin/link-health/:id` | `{ "confirm": "DELETE" }` |
| `GET/POST` | `/api/cron/check-links` | scheduled batch, `CRON_SECRET` required |

## 7. Public UI

- `components/ui/LinkStatusBadge.tsx` now accepts `lastVerified` and shows a
  clock marker when the last verification is older than 14 days.
- `components/ui/SourceCard.tsx` and `app/sources/[id]/page.tsx` pass
  `source.last_verified`, so every card exposes freshness in its tooltip.
- Hidden sources are excluded from `listSources`, detail pages, featured/top
  lists, related sources, diagnosis recommendations, category counts, portal
  stats, `lib/seo.ts` counts and `sitemap.xml`.

## 8. Runbook

```sql
-- Current distribution
SELECT link_status, COUNT(*) FROM sources GROUP BY link_status ORDER BY 2 DESC;

-- Queue (oldest first)
SELECT id, name, url, link_status, last_verified
  FROM sources
 WHERE is_hidden = false
 ORDER BY last_verified ASC NULLS FIRST
 LIMIT 20;

-- Stale links
SELECT COUNT(*) FROM sources
 WHERE is_hidden = false AND last_verified < (CURRENT_DATE - INTERVAL '7 days')::text;

-- Recent checks
SELECT s.id, s.name, r.status_code, r.link_status, r.checked_at
  FROM link_reports r JOIN sources s ON s.id = r.source_id
 ORDER BY r.checked_at DESC LIMIT 20;

-- History growth (retention candidate after ~1 year)
SELECT COUNT(*) FROM link_reports;
```

Runbook steps when a DEAD link appears:

1. Open the source URL manually; confirm it is really gone.
2. Check the destination site for a replacement URL.
3. In `/admin/link-health`, **Edit** → new URL → save (this is the explicit
   confirmation required for URL changes).
4. If there is no replacement, **Hide** (reversible). Delete only after a
   second review.

Fallback when the CLI cannot run (no Node):

```bash
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' -L \
  --max-time 12 -A 'TunisianAutoSources-LinkHealth/1.0' https://example.com/
```

## 9. Security & safety

- Read-only by default: `npm run check-links` never writes.
- Writes require `--write`, an authenticated admin PATCH, or a cron request
  carrying `CRON_SECRET`.
- URLs are never modified by automation.
- Deletion requires an explicit confirmation token.
- No credential is logged. `.env.local` stays git-ignored.
- All admin/cron responses are `Cache-Control: no-store`.
- Reports contain URLs and status codes only — no tokens, cookies or headers.
