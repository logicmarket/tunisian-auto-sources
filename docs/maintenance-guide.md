# 🔧 دليل الصيانة — Maintenance Guide

## 1. الجدول الدوري

| المهمة | التكرار | الأداة / المكان |
| --- | --- | --- |
| فحص الروابط الميتة | يوميًا (تلقائي) | Vercel Cron + GitHub Actions |
| مراجعة الاقتراحات الجديدة | أسبوعيًا | `/admin/submissions` |
| مراجعة صحة الروابط | أسبوعيًا | `/admin/link-health` |
| تحديث أوصاف المصادر | شهريًا | لوحة الإدارة / Prisma Studio |
| فحص الأداء | شهريًا | [PageSpeed Insights](https://pagespeed.web.dev/) |
| فحص SEO | شهريًا | Google Search Console |
| تحديث أكواد OBD | ربع سنوي | لوحة الإدارة |
| مراجعة الاعتماديات | أسبوعيًا (Dependabot) | GitHub → Pull Requests |
| نسخة احتياطية موثّقة | شهريًا | Neon → Branches |
| مراجعة شاملة | سنويًا | يدوي |

---

## 2. المهام الدورية بالتفصيل

### 2.1 فحص صحة الروابط

- **Vercel Cron** ينادي `/api/cron/check-links` يوميًا 03:00 UTC.
- **GitHub Actions** يشغّل `Link health` يوميًا 03:15 UTC كمسار احتياطي.
- السجل يُحفظ في جدول `link_reports` ( append-only).
- التشغيل اليدوي:

```bash
npm run check-links              # معاينة فقط
npm run check-links:write        # كتابة النتائج
npm run check-links:write -- --only=DEAD --limit=20
```

سياسة التصنيف:

| الحالة | المعنى |
| --- | --- |
| `LIVE` | 2xx على نفس الرابط |
| `REDIRECT` | 2xx بعد إعادة توجيه |
| `DEAD` | 404 أو 410 مؤكد فقط |
| `UNKNOWN` | 401/403/429/5xx أو مهلة — لا يعني رابطًا ميتًا |

> لا تحذف مصدرًا تلقائيًا. راجع `DEAD` يدويًا، ثم أخفِ المصدر
> (`is_hidden = true`) بدل الحذف.

### 2.2 مراجعة الاقتراحات

1. افتح `/admin/submissions` وأدخل `ADMIN_TOKEN`.
2. تحقق من الرابط والوصف والتصنيف.
3. وافق أو ارفض مع سبب.
4. بعد الموافقة، أضف المصدر إلى الكتالوج (أو دع سكربت الاستيراد يعمل).

### 2.3 تحديث البيانات

- استخدم `npx prisma studio` للتعديلات الصغيرة.
- للتعديلات الكبيرة: حدّث `data/*.json` ثم شغّل `npm run db:seed` في بيئة
  اختبار، لا في الإنتاج مباشرة.
- بعد أي تغيير جماهيري، أعد نشر الصفحات المتأثرة (ISR يتحدث خلال ساعة، أو
  أعد النشر فورًا).

---

## 3. إجراءات الطوارئ

### 3.1 الموقع معطّل (500/502)

1. Vercel → Deployments → **Instant Rollback** لآخر نشر ناجح.
2. افتح Sentry وحدد الاستثناء الأول (أول خطأ زمنيًا).
3. أصلح على فرع `fix/*`، ادفع PR، ثم انشر.
4. وثّق الحادثة في `CHANGELOG.md` إن كان الأثر على المستخدمين.

### 3.2 قاعدة البيانات معطّلة

1. Neon Console → تحقق من حالة المشروع والفرع.
2. Vercel → Settings → Environment Variables: تحقق من `DATABASE_URL`
   و`DIRECT_URL` (pooled مقابل direct).
3. تحقق من حدود الاتصالات (Neon compute) — قد تحتاج إعادة تشغيل الـ compute.
4. إن استمر العطل، أنشئ فرعًا من آخر نقطة سليمة وحدّث الروابط.

### 3.3 أخطاء 500 متكررة

1. Sentry → Issues → رتّب حسب التكرار.
2. حدد المسار والوظيفة (`route.ts`) والسطر.
3. أضف اختبارًا يدويًا أو سكربت تحقق.
4. أصلح، `npm run typecheck && npm run build`، ثم PR.

### 3.4 تسريب مفتاح أو سر

1. أبطِل المفتاح فورًا (Neon password rotation / GitHub PAT revoke / rotate
   `ADMIN_TOKEN` و`CRON_SECRET`).
2. حدّث Vercel Environment Variables وأعد النشر.
3. راجع السجلات لمعرفة نطاق الاستخدام.
4. لا تحذف تاريخ Git؛ أضف السر الجديد فقط بعد إبطال القديم.

---

## 4. النسخ الاحتياطي والاستعادة

- **Neon** يوفّر نسخًا تلقائيًا حسب الخطة.
- نسخة يدوية فورية: Neon Console → **Branches → Create branch** من `main`.
- استعادة: أنشئ فرعًا من النقطة المطلوبة، اختبره، ثم وجّه `DATABASE_URL`
  إليه مؤقتًا.
- للبيانات النصية: `pg_dump "$DIRECT_URL" --data-only --table=sources ...`.

---

## 5. فحوصات سريعة (Runbook)

```bash
# الحالة العامة
curl -o /dev/null -s -w "%{http_code}\n" https://<domain>/

# 404 صحيح
curl -o /dev/null -s -w "%{http_code}\n" https://<domain>/sources/999999

# صحة القاعدة
npx prisma migrate status

# إحصاءات
psql "$DIRECT_URL" -c "SELECT link_status, COUNT(*) FROM sources GROUP BY 1 ORDER BY 2 DESC;"
psql "$DIRECT_URL" -c "SELECT COUNT(*) FROM link_reports;"
```

---

## 6. حدود الخدمة (Vercel Hobby)

| المورد | الحد |
| --- | --- |
| Cron jobs | 1 يوميًا (جدولنا يستخدم واحدًا) |
| مدة الدالة | تُضبط عبر `maxDuration` في المسار |
| النطاق المخصص | مدعوم |

إذا احتجت فحصًا أسرع أو أكثر من cron واحد، استخدم GitHub Actions أو الخطة Pro.
