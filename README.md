# 🚗 بوابة مصادر السيارات التونسية

**Tunisian Automotive Sources Portal** — دليل عملي لمصادر تشخيص وإصلاح
السيارات في السوق التونسي، مبني للميكانيكيين المحترفين وللورشات.

A curated, Arabic-first resource hub for automotive diagnostics and repair in
Tunisia.

[![CI Pipeline](https://github.com/logicmarket/tunisian-auto-sources/actions/workflows/ci.yml/badge.svg)](https://github.com/logicmarket/tunisian-auto-sources/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-0f1115.svg)](./LICENSE)

---

## ✨ المميزات · Features

| الميزة | Feature |
| --- | --- |
| 📚 **141 مصدرًا مصنَّفًا** حسب النظام والمهمة | 141 curated repair sources, categorised by system + task |
| 🔍 **442 كود OBD-II** بالعربية والإنجليزية | 442 OBD-II codes with Arabic + English explanations |
| 🩺 **أداة تشخيص مزدوجة**: كود OBD أو أعراض | Guided diagnosis by OBD code or by symptoms (38 symptoms, 116 mappings) |
| ⭐ **مفضلة وتقييم ومقارنة** محفوظة محليًا | Bookmarks, ratings and side-by-side comparison |
| 🔎 **بحث فوري** عربي/إنجليزي | Instant Arabic + English search |
| 📱 **واجهة عربية RTL** وجوال أولًا مع وضع داكن | Arabic RTL, mobile-first, dark by default |
| 🔗 **مراقبة صحة الروابط** تلقائيًا + لوحة إدارة | Automated link-health monitoring + admin dashboard |
| 🔐 **SEO متكامل**: Schema.org، خريطة 611 رابطًا، ISR | Schema.org graph, 611-URL sitemap, ISR |
| 🛡️ **مراقبة أخطاء** Sentry + تحليلات Vercel | Sentry error monitoring + Vercel Analytics |

---

## 🛠️ التقنيات · Tech Stack

| Technology | Purpose |
| --- | --- |
| Next.js 14.2 (App Router) | Framework |
| TypeScript 5.7 | Language |
| Tailwind CSS 3.4 | Styling (RTL, dark mode) |
| Prisma 6 | ORM + migrations |
| PostgreSQL 18 (Neon) | Cloud database |
| Vercel | Hosting, Cron, Analytics |
| GitHub Actions | CI + nightly link sweep |
| Sentry | Error monitoring |

---

## 🚀 البدء · Getting Started

```bash
git clone https://github.com/logicmarket/tunisian-auto-sources.git
cd tunisian-auto-sources
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

املأ `.env.local` بقيم Neon الحقيقية (`DATABASE_URL` + `DIRECT_URL`). لا تُرفع
هذا الملف إلى المستودع أبدًا — فهو مستبعد في `.gitignore`.

```bash
npx prisma migrate deploy   # apply migrations
npx prisma generate         # generate the client
npm run dev                 # http://localhost:3000
```

### متغيرات البيئة المطلوبة · Required environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon **pooled** connection string |
| `DIRECT_URL` | ✅ | Neon **direct** connection (Prisma Migrate) |
| `NEXT_PUBLIC_SITE_URL` | ✅ (prod) | Public origin, e.g. `https://…vercel.app` |
| `NEXT_PUBLIC_SITE_NAME` | — | Site name used in metadata |
| `ADMIN_TOKEN` | ✅ (prod) | Protects `/admin/*` and `/api/admin/*` |
| `CRON_SECRET` | ✅ (prod) | Bearer token for `/api/cron/check-links` |
| `SENTRY_DSN` | — | Enables Sentry when set |
| `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_WHATSAPP` | — | Footer contact |

القائمة الكاملة مع الشرح: [`docs/env-variables.md`](docs/env-variables.md).

---

## 📜 الأوامر · Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (`prisma generate` first) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create a migration in development |
| `npm run db:deploy` | Apply migrations (production/CI) |
| `npm run db:migrate:sqlite` | One-off SQLite → PostgreSQL import |
| `npm run db:verify` | Verify imported row counts |
| `npm run check-links` | Dry-run link health check (no writes) |
| `npm run check-links:write` | Check links and persist results |

---

## 🧱 بنية المشروع · Project structure

```text
app/                 App Router pages, metadata, API routes (incl. cron + admin)
components/          UI (layout, sources, OBD, diagnosis, SEO, admin)
lib/                 Data access, SEO, link-health engine, caches, helpers
prisma/              Schema + additive SQL migrations
scripts/             Migration, seeding, link checker, OG image source
assets/              Fonts + HTML source of the social card
docs/                Deployment, maintenance, user, SEO and runbooks
reports/             Link-health report template + generated reports
```

---

## 🌐 النشر · Deployment

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables above (Production + Preview).
3. Deploy. `vercel.json` registers the daily link-check cron.
4. Run `npx prisma migrate deploy` against the production database once.

الدليل الكامل: [`docs/deployment-guide.md`](docs/deployment-guide.md).

---

## 📖 التوثيق · Documentation

| Document | Description |
| --- | --- |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | دليل النشر على Vercel |
| [`docs/maintenance-guide.md`](docs/maintenance-guide.md) | دليل الصيانة الدورية والطوارئ |
| [`docs/user-guide.md`](docs/user-guide.md) | دليل المستخدم (ميكانيكي) |
| [`docs/link-health.md`](docs/link-health.md) | مراقبة صحة الروابط |
| [`docs/SEO-PERFORMANCE.md`](docs/SEO-PERFORMANCE.md) | SEO والأداء |
| [`docs/MIGRATION-GUIDE.md`](docs/MIGRATION-GUIDE.md) | ترحيل SQLite → PostgreSQL |
| [`docs/branching.md`](docs/branching.md) | استراتيجية الفروع |
| [`docs/growth-plan.md`](docs/growth-plan.md) | خطة النمو |
| [`CHANGELOG.md`](CHANGELOG.md) | سجل التغييرات |

---

## 🔒 الأمان · Security

- لا تُخزَّن أي بيانات اعتماد في المستودع؛ `.env*` مستبعدة.
- صفحات الإدارة محمية بـ `ADMIN_TOKEN` وموسومة `noindex`.
- نقطة cron تتطلب `Authorization: Bearer $CRON_SECRET`.
- رؤوس أمان (`nosniff`, `Referrer-Policy`, `Permissions-Policy`) مضبوطة في
  `next.config.mjs` و`vercel.json`.

---

## 🤝 المساهمة · Contributing

اقرأ [`docs/branching.md`](docs/branching.md). كل تغيير يمر عبر Pull Request،
ويجب أن ينجح `npm run typecheck` و`npm run build` قبل الدمج.

---

## 📄 الترخيص · License

[MIT](./LICENSE) © 2025 Logic Market
