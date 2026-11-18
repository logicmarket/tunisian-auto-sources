# إعداد خوادم MCP — GitHub · Neon · Filesystem

MCP (Model Context Protocol) يسمح للمساعد الذكي بقراءة المستودع وقاعدة البيانات
وكتابة الملفات عبر خوادم متخصصة. هذا الملف يوثّق الإعداد والتحقق والبدائل.

> **حالة هذا المستودع:** الخوادم **غير متصلة** في بيئة التنفيذ الحالية
> (لا توجد مفاتيح ولا برنامج MCP host). تم تنفيذ كل العمليات عبر Git وGitHub
> REST API وPrisma CLI، وهي مسجّلة في `PHASE-5-OUTPUT.md`.

---

## 1. الإعداد السريع (VS Code / Cursor / Windsurf)

الملف الجاهز: [`.vscode/mcp.json`](../.vscode/mcp.json). يطلب التوكن عند أول
تشغيل ولا يخزّنه في المستودع.

### GitHub MCP

```json
{
  "github": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github-token}" }
  }
}
```

1. <https://github.com/settings/tokens> → **Generate new token (classic)**.
2. الصلاحيات: `repo` و`workflow` فقط.
3. الصق التوكن عند طلب VS Code.
4. تحقق: «List my repositories» ثم «Get repository info for
   `logicmarket/tunisian-auto-sources`».

> حزمة `@modelcontextprotocol/server-github` مجتمعية وقد تُهمَل. البديل الرسمي:
> GitHub MCP Server (`ghcr.io/github/github-mcp-server` أو الخادم البعيد
> `https://api.githubcopilot.com/mcp/`).

### Neon MCP

```json
{
  "neon": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "mcp-server-neon"],
    "env": { "DATABASE_URL": "${input:database-url}" }
  }
}
```

- استخدم رابط **pooled** `DATABASE_URL`.
- يُفضّل مستخدم قاعدة بيانات للقراءة فقط.
- تحقق: «List tables» → يجب أن تعود 10 جداول مجال + `_prisma_migrations`، بما
  فيها `link_reports`.
- البديل الرسمي من Neon: `@neondatabase/mcp-server-neon` (يتطلب Neon API key).

### Filesystem MCP

```json
{
  "filesystem": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
  }
}
```

- تحقق: «Read package.json» → يجب أن يعود
  `tunisian-automotive-sources-portal`.

---

## 2. التحقق بعد الإعداد

| الخادم | الطلب | النتيجة المتوقعة |
| --- | --- | --- |
| GitHub | Get repository info | `logicmarket/tunisian-auto-sources`, private/public حسب الإعداد |
| GitHub | List workflows | `ci.yml`, `link-check.yml` |
| Neon | List tables | 10 جداول + `_prisma_migrations` |
| Neon | Run read-only query | `SELECT COUNT(*) FROM sources;` = 141 |
| Filesystem | Read `package.json` | اسم المشروع والإصدار 1.1.0 |

---

## 3. البدائل عند تعذّر MCP

| العملية | البديل المستخدم فعليًا |
| --- | --- |
| إنشاء مستودع / دفع | `git` + GitHub REST API + credential manager |
| قراءة/كتابة الملفات | أدوات الملفات المحلية |
| استعلام قاعدة البيانات | `@prisma/client` عبر `DATABASE_URL` |
| تشغيل migration | `npx prisma migrate deploy` |
| فحص الروابط | `npm run check-links:write` |

---

## 4. قواعد الأمان

- لا تضع توكنات في `.vscode/mcp.json` أو أي ملف متعقَّب.
- استخدم `inputs` أو متغيرات بيئة في نظام التشغيل.
- امنح أقل صلاحية ممكنة (repo + workflow فقط، وقراءة فقط لقاعدة البيانات).
- أبطِل أي توكن لصقته بالخطأ فورًا من إعدادات GitHub.
