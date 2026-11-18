# Link health report — template

> Copy this file to `reports/link-health/link-health-YYYY-MM-DD.md` or let
> `npm run check-links` generate the machine version automatically.

## Run metadata

| Field | Value |
| --- | --- |
| Run id | `link-health-<timestamp>` |
| Started (UTC) | `<ISO timestamp>` |
| Finished (UTC) | `<ISO timestamp>` |
| Duration | `<seconds>` s |
| Trigger | `manual` / `vercel-cron` / `github-actions` |
| Mode | `dry-run` / `write` |
| Targets selected | `<n>` |
| Filters | `only=<...>`, `stale-days=<n>`, `limit=<n>`, `include-hidden=<bool>` |
| Database | Neon PostgreSQL (`neondb`) |
| Application version | `<git sha or package version>` |

## Status distribution

| Status | Count | % of checked |
| --- | ---: | ---: |
| LIVE | | |
| REDIRECT | | |
| UNKNOWN | | |
| UNVERIFIED | | |
| DEAD | | |
| **Total** | | 100 % |

Healthy share (`LIVE + REDIRECT`): `<percent>` %.

## Changes in this run

| # | Source | URL | Previous | New | HTTP | Detail |
| ---: | --- | --- | --- | --- | ---: | --- |
| | | | | | | |

## Dead links (404/410) — requires manual review

| # | Source | URL | HTTP | First seen dead | Action taken |
| ---: | --- | --- | ---: | --- | --- |
| | | | | | hide / replace / delete |

## Redirects

| # | Source | Requested URL | Final URL | HTTP |
| ---: | --- | --- | --- | ---: |
| | | | | |

## Unknown / blocked (not errors of the portal)

| # | Source | URL | HTTP / error | Likely cause |
| ---: | --- | --- | --- | --- |
| | | | | bot protection / timeout / 5xx |

## Queue health

| Metric | Value |
| --- | ---: |
| Sources total | |
| Hidden | |
| Never checked | |
| Stale > 7 days | |
| Stale > 30 days | |
| Checked today | |
| Last check timestamp | |

## Recommendations

1. Replace dead links where an official successor exists.
2. Re-run UNKNOWN hosts with a longer timeout before hiding.
3. Hide (do not delete) sources with no replacement to preserve history.
4. Review `link_reports` retention after 12 months.

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Operator | | |
| Reviewer | | |
