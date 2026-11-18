# Environment Variables

Reference for the **Tunisian Automotive Sources Portal** after the Phase 5
SQLite → Neon PostgreSQL migration.

Legend: **R** = required in production · **O** = optional · **D** = development only.

---

## 1. Database

### `DATABASE_URL` — **R**

The PostgreSQL connection string used by Prisma Client at runtime.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15"
```

Rules:

* Must start with `postgresql://` (or `prisma://` for Accelerate).
* On Neon, use the **pooled** host (`...-pooler...`). Vercel functions are
  serverless and can open many short-lived connections; the pooler is what
  keeps you inside the free tier's connection limit.
* Always include `sslmode=require`.
* When using the pooled endpoint, add `pgbouncer=true` so Prisma disables
  prepared statements that PgBouncer transaction mode cannot support.
* **Never commit this value.** It lives in `.env.local` (local) and in the
  Vercel project settings (production/preview).

### `DIRECT_URL` — **R** for migrations

The unpooled/direct Neon connection. `prisma migrate` cannot run through
PgBouncer transaction mode because it needs sessions and advisory locks.

```dotenv
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
```

Remove `-pooler` from the host. For local PostgreSQL or Supabase direct
connections, set `DIRECT_URL` to the same value as `DATABASE_URL`.

### `PRISMA_ACCELERATE_URL` — **O**

If present, `lib/db.ts` uses this URL instead of `DATABASE_URL`. Use it when you
add Prisma Accelerate in front of Neon:

```dotenv
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=REPLACE_ME"
```

No code change is required; the client detects the `prisma://` scheme.

### `SQLITE_DATABASE_PATH` — **D**

Only read by `scripts/migrate-sqlite-to-postgres.ts`. Default:
`./data/car-sources.db`.

```dotenv
SQLITE_DATABASE_PATH="./data/car-sources.db"
```

### `ALLOW_RUNTIME_SEEDING` — **O**

`false` by default in production. When `true`, the first request on an empty
database runs the full seed. Keep it **false on Vercel** and seed during the
deployment step (`npm run db:seed`) to avoid writing during requests.

---

## 2. Site identity

### `NEXT_PUBLIC_SITE_URL` — **R**

Canonical public origin, used by `sitemap.xml`, `robots.txt`, canonical tags
and absolute links.

```dotenv
NEXT_PUBLIC_SITE_URL="https://your-domain.vercel.app"
```

No trailing slash.

### `NEXT_PUBLIC_SITE_NAME` — **R**

Human-readable site name used in metadata and email templates.

```dotenv
NEXT_PUBLIC_SITE_NAME="بوابة مصادر السيارات التونسية"
```

### `NEXT_PUBLIC_CONTACT_EMAIL` — **O**

Public contact address rendered in the footer / About page. Leave empty to hide
the contact link.

### `NEXT_PUBLIC_WHATSAPP` — **O**

Public WhatsApp number (international format, digits only) used by the contact
block. Leave empty to hide it.

---

## 3. Admin review

### `ADMIN_TOKEN` — **R** in production

Shared secret for `/admin/submissions` and `/api/admin/*`. Sent as
`x-admin-token` header or an HTTP-only cookie.

Generate:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If unset, admin routes stay locked. The development fallback `dev-admin` is
never accepted when `NODE_ENV=production`.

---

## 4. Email notifications (optional)

The portal never requires SMTP to function. Every notification is written to
the `notifications` outbox table first; delivery is best-effort.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SMTP_HOST` | O | Mail server hostname, e.g. `smtp.eu.mailgun.org` |
| `SMTP_PORT` | O | `587` (STARTTLS) or `465` (TLS) |
| `SMTP_USER` | O | SMTP username |
| `SMTP_PASSWORD` | O | SMTP password / API key |
| `ADMIN_EMAIL` | O | Where admin review digests are sent |
| `NOTIFY_WEBHOOK_URL` | O | HTTP endpoint that drains the outbox with `{to, subject, text}` JSON |

```dotenv
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
ADMIN_EMAIL=""
```

> The current codebase queues emails and supports `NOTIFY_WEBHOOK_URL`.
> SMTP variables are reserved for the mail worker; setting them alone does not
> start an SMTP client.

---

## 5. Error tracking (optional)

### `SENTRY_DSN` — **O**

Server-side Sentry DSN. Add `NEXT_PUBLIC_SENTRY_DSN` only if you initialise the
browser SDK.

```dotenv
SENTRY_DSN=""
```

The app runs normally when empty; errors are still logged to the Vercel
function logs (without leaking credentials).

---

## 6. reCAPTCHA (optional)

```dotenv
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=""
RECAPTCHA_SECRET_KEY=""
```

When unset, submissions are protected by the local blocklist, honeypot and
IP rate limit only.

---

## 7. Seeding and maintenance

| Variable | Default | Purpose |
| --- | --- | --- |
| `SEED_DATA_PATH` | `./data/sources.json` | Override sources export |
| `OBD_DATA_PATH` | `./data/obd-codes.json` | Override OBD export (falls back to `./obd-codes-database.json`) |
| `MIGRATION_REPORT_DIR` | `./migration-reports` | Where JSON/Markdown migration reports are written |
| `PRISMA_LOG` | unset | `1` prints SQL queries (development only) |

---

## 8. Neon setup (5 minutes)

1. Create a project at <https://neon.tech> (free tier: 0.5 GB).
2. Open **Dashboard → Connection Details**.
3. Copy **Pooled connection** → `DATABASE_URL`.
4. Toggle off *Connection pooling* and copy **Direct connection** →
   `DIRECT_URL`.
5. Append `?sslmode=require&pgbouncer=true&connect_timeout=15` to the pooled
   URL if Neon did not already include it.
6. Validate from your machine:

   ```bash
   npx prisma migrate deploy
   npm run db:migrate:sqlite -- --dry-run
   npm run db:migrate:sqlite
   npm run db:verify
   ```

## 9. Vercel setup

Project → **Settings → Environment Variables**:

| Name | Environments | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview, Development | pooled Neon URL |
| `DIRECT_URL` | Production, Preview | direct Neon URL (migrations) |
| `NEXT_PUBLIC_SITE_URL` | All | e.g. `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_SITE_NAME` | All | Arabic site name |
| `NEXT_PUBLIC_CONTACT_EMAIL` | All | optional public contact address |
| `NEXT_PUBLIC_WHATSAPP` | All | optional public WhatsApp number |
| `ADMIN_TOKEN` | Production, Preview | long random value |
| `SENTRY_DSN` | Production | optional |
| `SMTP_*` / `ADMIN_EMAIL` | Production | optional |

Recommended build command:

```bash
npx prisma generate && npx prisma migrate deploy && next build
```

If you prefer not to migrate during a build, run
`npx prisma migrate deploy` from CI or a one-off `vercel run` before promoting
the deployment. Never run `prisma migrate reset` against production.

## 10. Security rules

* `.env`, `.env.local` and `.env*.local` are git-ignored; `.env.example` is the
  only committed file and contains placeholders.
* No credential is ever hardcoded in `lib/`, `scripts/`, `app/` or docs.
* Rotate `ADMIN_TOKEN` and database passwords immediately if a value leaks.
* Use Neon's **restricted** database role for the app when available; keep the
  owner role for migrations.
* `DATABASE_URL` must never be exposed with a `NEXT_PUBLIC_` prefix.

## 11. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `P1001: Can't reach database server` | wrong host, suspended Neon branch, IP allowlist | wake the Neon project, re-copy the host, check `sslmode` |
| `P2024: Timed out fetching a connection` | using the direct URL in serverless, or too many instances | switch `DATABASE_URL` to the pooled host |
| `prepared statement "s0" already exists` | pooled URL without `pgbouncer=true` | add `pgbouncer=true` |
| `Environment variable not found: DATABASE_URL` | missing Vercel env or `.env.local` | add it, redeploy |
| `P3005: database schema is not empty` | `migrate deploy` against a non-empty DB | back up, baseline the migration, or use `db push` for the first run |
| Arabic “خطأ في الاتصال بقاعدة البيانات” | DB unreachable after 3 retries | check Neon status and Vercel logs; the API returns HTTP 503 |
