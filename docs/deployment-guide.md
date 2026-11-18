# دليل النشر — Vercel Deployment Guide

هذا الدليل يشرح نشر **بوابة مصادر السيارات التونسية** على Vercel مع قاعدة
بيانات Neon PostgreSQL، وربط المراقبة والتحليلات.

---

## 1. المتطلبات المسبقة

| المطلوب | ملاحظة |
| --- | --- |
| مستودع GitHub | `logicmarket/tunisian-auto-sources` |
| حساب Vercel | مربوط بحساب GitHub |
| قاعدة Neon | PostgreSQL 18، مع `DATABASE_URL` (pooled) و`DIRECT_URL` (direct) |
| Node.js | 22.12 أو أحدث (محليًا وللبناء) |

---

## 2. إنشاء المشروع على Vercel

1. افتح <https://vercel.com/new>.
2. اختر **Import Git Repository** ثم المستودع.
3. الإعدادات (تُكتشف تلقائيًا):
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. لا تضغط Deploy قبل إضافة متغيرات البيئة (الخطوة 3).

> `package.json` يحتوي `"postinstall": "prisma generate"`، لذا يُولَّد Prisma
> Client تلقائيًا على Vercel.

---

## 3. متغيرات البيئة

أضِفها من **Settings → Environment Variables** لكل من Production وPreview
(القيم نفسها لا تُكتب في المستودع):

| Variable | مطلوب | البيئات | الوصف |
| --- | :---: | --- | --- |
| `DATABASE_URL` | ✅ | Production, Preview | رابط Neon **pooled** (`-pooler`) مع `sslmode=require&pgbouncer=true` |
| `DIRECT_URL` | ✅ | Production, Preview | رابط Neon المباشر (بدون `-pooler`) — يستخدمه Prisma Migrate |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Production | أصل الموقع العام، مثال `https://tunisian-auto-sources.vercel.app` |
| `NEXT_PUBLIC_SITE_NAME` | — | Production | اسم الموقع في الميتاداتا |
| `ADMIN_TOKEN` | ✅ | Production | حماية `/admin/*` و`/api/admin/*` |
| `CRON_SECRET` | ✅ | Production | Bearer token لنقطة `/api/cron/check-links` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | — | Production | بريد التواصل في التذييل |
| `NEXT_PUBLIC_WHATSAPP` | — | Production | رقم واتساب (دولي، بلا +) |
| `SENTRY_DSN` | — | Production | يفعّل Sentry عند وجوده |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Production | اختياري لالتقاط أخطاء المتصفح |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | — | Production | رفع Source Maps (اختياري) |
| `SENTRY_TRACES_SAMPLE_RATE` | — | Production | افتراضي `0.1` |

توليد أسرار عشوائية:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ لا تضع أي سر في `NEXT_PUBLIC_*`؛ هذه القيم تظهر في حزمة المتصفح.

---

## 4. تطبيق مخطط قاعدة البيانات

من جهازك (مرة واحدة لكل بيئة جديدة)، مع تعيين `DIRECT_URL` للإنتاج:

```bash
npx prisma migrate deploy
npx prisma generate
```

يتحقق الأمر:

```bash
npx prisma migrate status
```

يجب أن تظهر **Database schema is up to date**. الـ migrations الحالية:

- `20261116150150_init`
- `20261117120000_link_health_monitoring`

---

## 5. النشر

1. اضغط **Deploy** وانتظر 2–5 دقائق (البناء يشمل `prisma generate`).
2. افتح رابط النشر.
3. أول نشر قد يستغرق أطول بسبب تسخين صفحات ISR.

### بعد النشر — تحقق من الـ Cron

`vercel.json` يسجّل:

```json
{ "path": "/api/cron/check-links", "schedule": "0 3 * * *" }
```

- Vercel يضيف ترويسة `Authorization: Bearer $CRON_SECRET` تلقائيًا للمسار.
- اختبره يدويًا:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://<domain>/api/cron/check-links
```

يجب أن يعيد `200` مع ملخص JSON. بدون الترويسة يعيد `401`.

> خطة Hobby تسمح بـ Cron يومي واحد؛ الخطة Pro تسمح بتكرار أدق. جدول 03:00
> يوميًا يعمل على الخطتين.

---

## 6. قائمة التحقق بعد النشر

| # | الفحص | المتوقع |
| ---: | --- | --- |
| 1 | الصفحة الرئيسية | 200، عربية RTL، وضع داكن |
| 2 | `/sources` | 141 مصدرًا (أو العدد الحالي) |
| 3 | `/sources/1` | 200 ويعرض تفاصيل المصدر |
| 4 | `/sources/999999` | **404** (وليس 200) |
| 5 | `/obd-codes/P0300` | 200 |
| 6 | `/obd-codes/ZZZZZ` | **404** |
| 7 | `/search?q=P0300` | نتائج صحيحة |
| 8 | `/tools/diagnosis` | الأداتان تعملان |
| 9 | الجوال (عرض 390px) | بلا تمرير أفقي |
| 10 | `/sitemap.xml` | 611 رابطًا (أو العدد الحالي) |
| 11 | `/robots.txt` | يمنع `/api`, `/admin`, `/search` |
| 12 | `/og-image.png` | PNG 1200×630 |
| 13 | مشاركة الرابط على واتساب | تظهر البطاقة والصورة |
| 14 | `https://` | شهادة صالحة |
| 15 | Sentry (إن فُعّل) | خطأ تجريبي يظهر في اللوحة |
| 16 | Analytics | زيارات تظهر بعد تفعيلها |

فحص سريع من الطرفية:

```bash
for p in / /sources /sources/1 /sources/999999 /obd-codes/P0300 /obd-codes/ZZZZZ /sitemap.xml /robots.txt /og-image.png; do
  printf "%-22s %s\n" "$p" "$(curl -o /dev/null -s -w '%{http_code}' "https://<domain>$p")"
done
```

---

## 7. النطاق المخصص (اختياري)

1. Vercel → Project → **Settings → Domains → Add**.
2. أضف النطاق (مثال: `auto-sources.tn`).
3. في مزوّد DNS:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

4. انتظر التحقق (قد يستغرق حتى 48 ساعة حسب TTL).
5. حدّث `NEXT_PUBLIC_SITE_URL` إلى النطاق النهائي ثم أعد النشر.

---

## 8. التراجع الفوري · Instant Rollback

1. Vercel → Project → **Deployments**.
2. اختر آخر نشر ناجح (✅) → `…` → **Instant Rollback**.
3. أكّد. يصبح النشر السابق هو الإنتاج خلال ثوانٍ.

> التراجع لا يعيد قاعدة البيانات. إن كان العطل من migration، استخدم فرع Neon
> احتياطيًا (Neon → Branches) أو migration عكسيًا مكتوبًا يدويًا.

---

## 9. سيناريوهات الفشل الشائعة

| الخطأ | السبب | الحل |
| --- | --- | --- |
| `PrismaClientInitializationError` | `DATABASE_URL` خاطئ أو ناقص | تحقق من الرابط pooled ومن `sslmode=require` |
| `Can't reach database server` | `DIRECT_URL` غير مضبوط للـ migrations | أضف `DIRECT_URL` في Vercel أو نفّذ `migrate deploy` محليًا |
| `prisma generate` يفشل | `postinstall` محجوب | أعد النشر وتأكد من `package.json` |
| Build killed / heap | ذاكرة غير كافية | أضف `NODE_OPTIONS=--max-old-space-size=4096` |
| `Module not found` | `package-lock.json` غير محدَّث | `npm ci` محليًا ثم ارفع القفل |
| TypeScript errors | فشل `tsc` | `npm run typecheck` وأصلح الأخطاء |
| صفحات 500 بعد النشر | تعذر الاتصال بقاعدة البيانات | Sentry → الأثر، ثم تحقق من Neon |
| Cron يعيد 401 | `CRON_SECRET` غير مضبوط | أضفه في Vercel وأعد النشر |
| الصورة الاجتماعية لا تظهر | كاش المنصة | استخدم [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) لإعادة الزحف |

---

## 10. بعد النشر — المراقبة

- **Sentry**: أنشئ مشروع Next.js، انسخ DSN إلى Vercel، ثم أعد النشر. بدون DSN
  يبقى SDK خاملًا ولا يكسر البناء.
- **Vercel Analytics**: Project → **Analytics → Enable**. المكوّن `<Analytics />`
  مضاف بالفعل في `app/layout.tsx`.
- **Google Search Console**: أضف النطاق وارفع `sitemap.xml`.
- **Link health**: راقب `/admin/link-health` أسبوعيًا (يتطلب `ADMIN_TOKEN`).

---

## 11. أوامر مرجعية

```bash
npm run build            # بناء الإنتاج
npm run typecheck        # تحقق TypeScript
npm run lint             # ESLint
npx prisma migrate status
npm run check-links      # فحص الروابط (بدون كتابة)
npm run check-links:write
```
