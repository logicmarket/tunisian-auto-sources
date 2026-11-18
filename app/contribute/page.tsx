/**
 * File: app/contribute/page.tsx
 * Purpose: Public page for suggesting a new source. The form is client-side;
 * the taxonomy options come from the same catalogue used by the rest of the
 * portal so a submission can never invent a category.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ContributeForm } from "@/components/phase4/contribute/ContributeForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { SYSTEM_META, TASK_META } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, webPageJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "أضف مصدراً",
  description:
    "اقترح موقعاً أو قاعدة بيانات تقنية لمصادر السيارات التونسية. نراجع كل اقتراح يدوياً قبل النشر.",
  path: "/contribute",
  keywords: [
    "أضف مصدراً",
    "اقتراح مصدر",
    "مصادر السيارات",
    "قاعدة بيانات تقنية",
    "تونس",
  ],
});

const RULES = [
  {
    icon: ShieldCheck,
    title: "مصادر تقنية فقط",
    body: "أدلة إصلاح، مخططات كهربائية، قواعد أكواد، برامج تشخيص. لا إعلانات ولا روابط تحميل مشبوهة.",
  },
  {
    icon: ClipboardCheck,
    title: "مراجعة يدوية",
    body: "نتحقق من الرابط ومناسبته وعدم تكراره. قد نطلب تعديل الوصف قبل النشر.",
  },
  {
    icon: Clock3,
    title: "3 اقتراحات كحد أقصى/ساعة",
    body: "الحماية من الإغراق تعتمد على عنوان IP. تجاوز الحد يعيد رسالة انتظار واضحة.",
  },
  {
    icon: XCircle,
    title: "ما لا نقبله",
    body: "روابط منتهية، محتوى إباحي أو قمار، صفحات تحميل مقرصنة، أو مصادر تبيع بيانات شخصية.",
  },
];

export default function ContributePage() {
  const systems = SYSTEM_META.map((system) => ({
    value: system.value,
    label: system.label,
    description: system.description,
  }));
  const tasks = TASK_META.map((task) => ({
    value: task.value,
    label: task.label,
    description: task.description,
  }));

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "أضف مصدراً",
            description:
              "نموذج اقتراح مصدر تقني جديد مع مراجعة يدوية قبل النشر.",
            path: "/contribute",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "أضف مصدراً", path: "/contribute" },
          ]),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-bl from-accent/[0.07] via-transparent to-primary-800/25"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "أضف مصدراً" },
            ]}
          />

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-300">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                مساهمة المجتمع
              </p>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                مصدر تعتمد عليه؟ شاركه مع الورشات
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-strong">
                ساعدنا في بناء دليل عملي لميكانيكيي تونس. أضف موقعاً تستعمله
                فعلاً، وسنراجعه قبل نشره مع اسمك إن أردت المتابعة بالبريد.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/contribute/status"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                متابعة اقتراح
                <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              </Link>
              <Link
                href="/sources"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                كل المصادر
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <ContributeForm
            systems={systems}
            tasks={tasks}
            recaptchaSiteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          />

          <aside className="space-y-3 lg:sticky lg:top-24">
            {RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <div key={rule.title} className="surface-card p-4">
                  <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                    <Icon className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                    {rule.title}
                  </h2>
                  <p className="mt-1.5 text-[10px] leading-6 text-muted">{rule.body}</p>
                </div>
              );
            })}

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
              <p className="text-[10px] leading-6 text-muted">
                لا ترسل روابط تتطلب حساباً مدفوعاً أو تحتوي ملفات تنفيذية. إن كان
                المصدر مدفوعاً، اذكر ذلك بوضوح في سبب الاقتراح.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
