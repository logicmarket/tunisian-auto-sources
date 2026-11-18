# استراتيجية الفروع · Branching Strategy

## البنية · Structure

```text
main (production, protected)
├── dev (integration)
│   ├── feature/*   (new features)
│   └── fix/*       (bug fixes)
└── release/*       (pre-release hardening)
```

## القواعد · Rules

1. **لا دفع مباشر إلى `main`** · Never push directly to `main`.
2. كل تغيير يصل عبر **Pull Request** · Every change lands through a PR.
3. يجب أن ينجح **CI** (`typecheck`, `lint`, `build`) قبل الدمج · CI must pass.
4. مراجعة واحدة على الأقل لتغييرات `main` · At least one review for `main`.
5. أسماء الفروع:
   - `feature/source-filters`
   - `fix/soft-404`
   - `docs/deployment-guide`
6. رسائل الالتزام تتبع Conventional Commits:
   - `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`
7. حذف الفرع بعد الدمج · Delete the branch after merge.

## الإصدارات · Releases

- ارفع `version` في `package.json`.
- أضف قسمًا في [`CHANGELOG.md`](../CHANGELOG.md).
- أنشئ وسمًا (`v1.1.0`) وRelease على GitHub.
- Vercel ينشر `main` تلقائيًا؛ استخدم **Instant Rollback** عند الحاجة.

## حماية `main` · Protecting `main`

من GitHub → Settings → Branches → Add branch protection rule:

- Require a pull request before merging (1 approval)
- Require status checks: **CI Pipeline / Typecheck, lint and build**
- Require branches to be up to date before merging

> الحماية غير مفعّلة تلقائيًا في هذا المستودع حتى لا تُقفل الدفع المباشر على
> المالك. فعّلها من الإعدادات بعد إضافة أول PR ناجح.
