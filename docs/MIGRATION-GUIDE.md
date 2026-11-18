# Migration Guide — `better-sqlite3` → Prisma → Neon PostgreSQL

This document explains **how** the data layer was rewritten, not just which
files changed. Read it before modifying queries or adding tables.

---

## 1. Why this is a rewrite, not a driver swap

The Phase 1–4 application did **not** use Prisma. `lib/db.ts` opened a
`better-sqlite3` `Database` handle and every repository called
`db.prepare(sql).all()/get()/run()` **synchronously**.

Prisma is asynchronous. Therefore:

| Before | After |
| --- | --- |
| `getDatabase()` returns a live handle | removed; use `prisma` from `lib/db.ts` |
| `db.prepare("SELECT …").all()` | `await prisma.source.findMany({ … })` |
| `db.prepare("INSERT …").run()` | `await prisma.source.create({ … })` |
| `db.transaction(fn)` | `await prisma.$transaction(async (tx) => …)` |
| `result.lastInsertRowid` | `create({ select: { id: true } })` |
| `INSERT OR IGNORE` | `createMany({ skipDuplicates: true })` or `upsert` |
| `PRAGMA table_info` | Prisma Client types + `prisma/migrations` |
| `row.created_at` (string) | `Date` → `toIso()` from `lib/mappers.ts` |

Every data-access function is now `async`. All call sites (`app/`, pages,
route handlers) already awaited route handlers, so the public API and component
props did not change.

---

## 2. Schema decisions

`prisma/schema.prisma` keeps the existing **snake_case field names** and maps
every model back to the SQLite table name with `@@map`. That preserves:

* raw SQL written against the old table/column names,
* `lib/types.ts` record shapes,
* JSON export formats,
* the UI, which reads `source.category_system`, `source.last_verified`, etc.

Type mapping:

| SQLite | PostgreSQL / Prisma | Notes |
| --- | --- | --- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `Int @id @default(autoincrement())` | becomes `SERIAL` |
| `TEXT` | `String @db.Text` | explicit `TEXT`, not `VARCHAR` |
| `TEXT` timestamps (`CURRENT_TIMESTAMP`) | `DateTime @db.Timestamptz(6)` | UTC instants, indexed |
| `last_verified TEXT` | `String? @db.Text` | calendar date (`YYYY-MM-DD`), **not** an instant |
| `REAL` | `Float` | `DOUBLE PRECISION` |
| `INTEGER` 0/1 flags (`helpful`, `flagged`) | `Int` / `Int?` | API still speaks `0 \| 1 \| null` |
| `TEXT` JSON arrays (`common_brands`, `spam_flags`) | `String @db.Text` | unchanged, parsed in JS |
| `UNIQUE` nullable (`slug`) | `String? @unique` | PostgreSQL treats NULLs as distinct, like SQLite |

`last_verified` was deliberately **not** converted to `DateTime`: it is a
calendar date, and converting it would shift values across time zones and break
the Arabic date formatting.

### Relations and deletes

| Child | Parent | Rule | Why |
| --- | --- | --- | --- |
| `ratings` | `sources` | `Cascade` | ratings are meaningless without the source |
| `source_feedback` | `sources` | `Cascade` | same |
| `symptom_mapping` | `symptoms`, `obd_codes` | `Cascade` | join rows |
| `submissions.published_source_id` | `sources` | `SetNull` | keep the submission history |
| `sources.submission_id` | — | plain `Int?` | legacy rows predate submissions |

`submissions.status_token` and `sources.url` / `sources.slug` are `UNIQUE`.
`obd_codes.code` is `UNIQUE`, so upserts by code are safe.

### Indexes

Added for every filter/sort the app performs:

* `sources(category_system)`, `(category_task)`, `(language)`, `(link_status)`
* `sources(rating DESC)`, `(created_at DESC)`, `(submission_id)`
* `obd_codes(category)`, `(system_category)`, `(family)`, `(severity)`, `(verification)`
* `symptoms(system_category, sort_order)`
* `symptom_mapping(symptom_id, priority_rank)`, `(obd_code)`, `(confidence)`
* `ratings(source_id, stars)`, `(visitor_id)`, `(flagged)`
* `submissions(status, created_at DESC)`, `(normalized_url)`, `(ip_address, created_at)`
* `source_feedback(source_id, kind)`
* `contact_messages(created_at DESC)`
* `notifications(status, created_at)`

---

## 3. Query rewrite notes

### Case-insensitive search

SQLite `LIKE` is case-insensitive for ASCII by default. PostgreSQL `LIKE` is
not. Queries that search text use Prisma's `mode: "insensitive"`, e.g.

```ts
prisma.obdCode.findMany({
  where: { OR: [{ code: { contains: q, mode: "insensitive" } }, …] },
});
```

### `COLLATE NOCASE`

Does not exist in PostgreSQL. Ordering uses `LOWER(column)` in SQL or
`localeCompare(…, { sensitivity: "base" })` in JS.

### `SELECT DISTINCT … ORDER BY LOWER(col)`

PostgreSQL rejects this because the `ORDER BY` expression is not in the select
list (SQLite allowed it). `getDistinctValues()` now selects distinct values and
sorts them in JS.

### `COUNT(*)` returns `bigint`

Prisma maps `COUNT(*)` to `BigInt`, which `JSON.stringify` cannot serialize.
Raw aggregates cast with `::int`; model aggregates (`_count`) are numbers.

### Date formatting

`toSourceRecord`, `toObdCodeRecord`, `toRatingRowView`, `toSubmissionRecord`
convert Prisma `Date` values to ISO strings. **Never return a raw Prisma row
from a route** — run it through a mapper first.

### Transactions

Approval (`reviewSubmission`) inserts the source and updates the submission in
one `$transaction`. If either statement fails, both roll back. The notification
is queued after the commit so a mail failure cannot undo the publication.

---

## 4. Connection, pooling and retries

`lib/db.ts`:

* builds one `PrismaClient` per process and caches it on `globalThis`
  (`__tasPrisma`) so Vercel hot reloads and reused lambdas share a pool;
* passes `DATABASE_URL` (pooled Neon host) to the client;
* wraps **every** model operation in `withDatabaseRetry()` through
  `$extends({ query: { $allOperations } })`;
* retries only transient errors (`P1001`, `P1002`, `P1008`, `P1017`, `P2024`,
  `P2028`, `P2034`, and matching socket messages) — **3 attempts** with
  exponential backoff (`250ms`, `500ms`);
* rethrows validation/unique/FK errors immediately so routes can answer
  `400/409/404` instead of a misleading `503`;
* exposes `DatabaseConnectionError` (`code = DATABASE_UNAVAILABLE`, `status = 503`)
  with the Arabic message
  `خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى بعد لحظات.`

`lib/api-error.ts` translates Prisma errors for all route handlers:

| Prisma code | HTTP | Arabic message |
| --- | --- | --- |
| `P2002` | 409 | هذا السجل موجود مسبقاً. |
| `P2025` | 404 | السجل المطلوب غير موجود. |
| `P2003` | 409 | لا يمكن تنفيذ العملية بسبب ارتباط البيانات بسجلات أخرى. |
| connection / init | 503 | خطأ في الاتصال بقاعدة البيانات… |

---

## 5. Seeding

`lib/seed.ts` and `lib/phase4/seed.ts` are idempotent:

* **sources** — URL is `UNIQUE`; `createMany({ skipDuplicates: true })` inserts
  only new URLs. Existing rows are never overwritten.
* **OBD codes** — `upsert` by `code`, so corrected descriptions refresh.
* **symptoms / mappings** — deterministic ids + `upsert`.
* explicit ids from the JSON/SQLite import are followed by
  `syncIdentitySequence()`, which advances each PostgreSQL sequence with
  `setval()`.

`ensureSeeded()` is called by read functions, but in production it returns
immediately unless `ALLOW_RUNTIME_SEEDING=true`. Vercel deploys should run
`npm run db:deploy && npm run db:seed` once instead.

---

## 6. Cut-over runbook

Use a maintenance window; the old SQLite app can keep serving reads while you
copy, but stop writes before the final import.

1. **Freeze writes** (put the old deployment in read-only / disable the
   contribute and rating forms, or take it down).
2. **Back up** `data/car-sources.db` (+ `-wal`, `-shm`) and export a copy
   outside the repo. Record its SHA-256; the importer prints the same hash.
3. **Create the Neon project**, copy pooled + direct URLs into `.env.local`.
4. `npm ci`
5. `npx prisma migrate deploy`
6. `npm run db:migrate:sqlite -- --dry-run`
   * expect `141 / 442 / 38 / 116` prepared rows and `Overall: PASS`
   * inspect `migration-reports/*.md` for errors or automatic repairs
7. `npm run db:migrate:sqlite`
8. `npm run db:verify`
9. `npm run db:seed` (safe: no duplicates)
10. Smoke test locally against the Neon database (`npm run dev`), then deploy.
11. Keep the SQLite file and the migration reports archived for at least one
    release cycle.

### Rollback

* **Code**: redeploy the previous build. It still needs PostgreSQL, so do not
  delete the database.
* **Data**: only on a fresh/staging database,
  `npm run db:migrate:sqlite -- --rollback --force`, then re-import.
* **Schema**: `prisma migrate diff` / a hand-written down migration reviewed by
  a human. There is no automatic down migration for a data migration.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `P1001` | wrong host, Neon suspended, firewall | wake the project, re-copy the host |
| `P2024` | direct URL in serverless, or too many instances | use the pooled `DATABASE_URL` |
| `prepared statement "s0" already exists` | pooled URL without `pgbouncer=true` | add `pgbouncer=true` |
| `Environment variable not found: DIRECT_URL` | CLI needs both URLs | set `DIRECT_URL` (= `DATABASE_URL` locally) |
| `P3005` schema not empty | `migrate deploy` on an existing DB | baseline the migration or `db push` for the first run |
| importer says `DATABASE_URL must be a PostgreSQL…` | a SQLite path is still configured | point it at Neon |
| duplicate key after import | identity sequence not advanced | rerun the import; `setval()` runs after inserts |
| Arabic 503 on every API | DB unreachable after 3 retries | check Neon status and function logs |

---

## 8. Adding a new table later

1. Add the model to `prisma/schema.prisma` with `@@map("snake_case_name")`.
2. `npx prisma migrate dev --name add_<table>` (local) and commit the generated
   SQL under `prisma/migrations/`.
3. `npx prisma migrate deploy` on Vercel/CI.
4. Add the table to `scripts/migrate-sqlite-to-postgres.ts` **only** if it
   exists in the legacy SQLite file (`PreparedData`, `TABLE_SPECS`,
   `targetTableInfo`, `insertAll`, and the rollback `TRUNCATE` list).
5. Add indexes for every column you filter or sort by.
