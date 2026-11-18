# Verification Report — Phase 5 · Task 1

What was executed to validate this kit, and the result of each check.

| Item | Value |
| --- | --- |
| Date | 2026-11-16 |
| Node.js | 22.15.0 |
| Prisma CLI / Client | 6.2.1 |
| PostgreSQL under test | 18.1 (local), plus a fresh-database `migrate deploy` run |
| SQLite source | `data/car-sources.db` (SHA-256 `530299286d23bee7eda62b2d90fd4311fa390770c1ef93613b6448f6c8ae478e`) |
| Overlay under test | `output/phase-5-task1/` applied over `output/phase-4-v2/` |

> Neon was not reachable from the build environment, so the same checks were run
> against a local PostgreSQL 18 instance. The connection strings differ; the
> schema, migrations, Prisma Client and SQL are identical.

---

## 1. Schema

```bash
npx prisma validate
# → The schema at prisma/schema.prisma is valid 🚀

npx prisma generate
# → Generated Prisma Client (v6.2.1)
```

Checked by inspection:

* `datasource db { provider = "postgresql" }`
* `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`
* 9 models, each with `@@map`
* 26 secondary indexes (filters, sorts, foreign keys, statuses)
* cascades on `ratings`, `source_feedback`, `symptom_mapping`; `SetNull` on
  `submissions.published_source_id`
* `@db.Text` on every free-text column, `@db.Timestamptz(6)` on timestamps

## 2. Migrations

```bash
npx prisma migrate dev --name init       # local: creates 20261116150150_init
npx prisma migrate deploy                # fresh database: applies it cleanly
npx prisma migrate status
# → Database schema is up to date!
```

## 3. Dry run (SQLite read + transform, no writes)

```bash
npm run db:migrate:sqlite -- --dry-run
```

| Table | SQLite rows | Prepared | Status |
| --- | ---: | ---: | --- |
| sources | 141 | 141 | PASS |
| obd_codes | 442 | 442 | PASS |
| symptoms | 38 | 38 | PASS |
| symptom_mapping | 116 | 116 | PASS |
| ratings / submissions / source_feedback / contact_messages / notifications | 0 | 0 | PASS |

Overall: **PASS**. Report written to `migration-reports/`.

## 4. Real import

```bash
npm run db:migrate:sqlite
```

| Table | Source | Prepared | Inserted | Target | Missing ids | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| sources | 141 | 141 | 141 | 141 | 0 | PASS |
| obd_codes | 442 | 442 | 442 | 442 | 0 | PASS |
| symptoms | 38 | 38 | 38 | 38 | 0 | PASS |
| symptom_mapping | 116 | 116 | 116 | 116 | 0 | PASS |
| other tables | 0 | 0 | 0 | 0 | 0 | PASS |

Overall: **PASS**.

## 5. Idempotency

* Second import run: `inserted = 0` for every table, target counts unchanged,
  `Overall: PASS`.
* `--verify-only`: `missing = 0` for every table, `Overall: PASS`.
* `npm run db:seed` run twice:
  * sources: `141 already present`, `0 inserted`
  * OBD: `442` upserted, `0 new`
  * symptoms/mappings: `38 / 116`, `0 skipped`
  * no duplicate rows.

## 6. Identity sequences

After importing explicit ids (max source id 150), a new source was created
through Prisma **without** an id and received id **151** — no primary-key
collision. The test row was deleted afterwards.

## 7. Rollback

```bash
npm run db:migrate:sqlite -- --rollback
# → Fatal: Refusing to roll back without --force. This TRUNCATEs all portal tables.

npm run db:migrate:sqlite -- --rollback --force
# → Rollback complete.
# → sources / obd_codes / symptom_mapping counts: 0 / 0 / 0
```

Re-running the import restored `141 / 442 / 116` with `Overall: PASS`.

## 8. Connection retry and Arabic errors

Pointing `DATABASE_URL` at a closed port:

```
is DatabaseConnectionError: true
code: DATABASE_UNAVAILABLE
status: 503
message: خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى بعد لحظات.
elapsed ms: 7069          # three attempts with exponential backoff
```

## 9. TypeScript

```bash
npx tsc --noEmit
# → no output (clean)
```

The check ran against the **whole** Phase 4 project with the overlay applied,
including the legacy `contribute/`, `diagnosis/` and `ratings/` feature bundles.
Those three copies of the Phase 4 data modules were updated in this kit so the
repository keeps compiling.

## 10. Read APIs against PostgreSQL

All invoked through the real route handlers with a `NextRequest`:

| Route | Status | Result |
| --- | --- | --- |
| `GET /api/sources?limit=10` | 200 | `count 10`, `total 141` |
| `GET /api/sources?system=engine` | 200 | `count 5`, `total 9` |
| `GET /api/sources/1` | 200 | source record, ISO dates |
| `GET /api/sources/99999` | 404 | Arabic not-found message |
| `GET /api/sources/1/rating` | 200 | summary object |
| `GET /api/categories` | 200 | 9 systems, 10 tasks, total 141 |
| `GET /api/search?q=toyota` | 200 | `query,total,sources,categories,obd` |
| `GET /api/sources/search?q=obd` | 200 | result list |
| `GET /api/sources/batch?ids=1,2,3` | 200 | 3 records |
| `GET /api/diagnosis/codes?q=P0300` | 200 | 1 code |
| `GET /api/diagnosis/codes/P0300` | 200 | code + 3 related + 3 sources + 4 hints |
| `GET /api/contribute/check?url=…` | 200 | duplicate detected |
| `GET /api/admin/submissions` | 200 | counts + list (with token) |

Portal aggregates matched the SQLite app: 141 sources, 72 LIVE, 19 REDIRECT,
10 Arabic, 9 systems, 10 tasks, average rating 3.8. Diagnosis index: 442 codes.

## 11. Write APIs against PostgreSQL

| Flow | Status | Observed |
| --- | --- | --- |
| `POST /api/contact` | 200 | row in `contact_messages` |
| `POST /api/sources/1/feedback` (rating, helpful) | 200 | rows in `source_feedback` |
| `POST /api/sources/1/rate` | 200 | rating created; average hidden below 3 |
| `POST /api/sources/1/rate` again | 200 | same row updated (unique source+visitor) |
| `POST /api/diagnosis/symptoms` | 200 | symptoms, brand, matches, initialSteps |
| `POST /api/contribute` | 201 | submission row + queued notification |
| `GET /api/contribute/status/:id` | 200 | pending submission |
| `PATCH /api/admin/submissions/:id` approve | 200 | source published (`id 151`, slug generated), submission linked |
| approve again | 409 | already reviewed |

Approval exercised the transaction + notification outbox. All verification rows
were deleted afterward and counts returned to `141 / 442 / 38 / 116`.

## 12. Environment and secrets

* `.env.example` is committed and contains placeholders only.
* `.env.local` contains placeholders only and is git-ignored.
* `.gitignore` excludes `.env`, `.env.local`, `.env*.local`, `/data/*.db*`,
  `*.sqlite*`, `/migration-reports/`.
* No connection string, token or password appears in `lib/`, `scripts/`,
  `app/` or `docs/`.

## 13. Not covered here

* A live Neon endpoint (no credentials in the build environment). The runbook in
  `README.md` / `MIGRATION-GUIDE.md` covers the identical steps; only the host,
  `pgbouncer=true` and TLS differ.
* SMTP delivery and reCAPTCHA scoring (external services, optional).
* Browser-level UI regression; no component or page markup changed, only the
  data layer behind the existing props.
