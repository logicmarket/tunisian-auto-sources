/**
 * File: app/how-to-use/page.tsx
 * Purpose: Three concrete usage scenarios with numbered steps, screenshot
 * placeholders and the expected outcome for each.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Image as ImageIcon,
  MonitorPlay,
  ScanLine,
  Search,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, buildMetadata, webPageJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "كيف تستعمل المنصة",
  description:
    "ثلاث حالات عملية: تشخيص كود P0301، البحث عن مصادر لإصلاح الفرامل، ومقارنة مصادر برمجة ECU.",
  path: "/how-to-use",
  keywords: [
    "كيف تستعمل المنصة",
    "تشخيص P0301",
    "إصلاح الفرامل",
    "برمجة ECU",
    "دليل الاستخدام",
  ],
});

interface Step {
  title: string;
  detail: string;
}

interface Scenario {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  icon: typeof Search;
  steps: Step[];
  screenshot: string;
  outcome: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "obd-p0301",
    eyebrow: "الحالة الأولى",
    title: "أمامي خطأ OBD: P0301 — كيف أستخدم المنصة؟",
    intro:
      "المصباح أضاء وقارئ الأكواد أعطاك P0301 (فقدان اشتعال في الأسطوانة 1). تريد معرفة معناه وأسبابه وخطوات فحصه قبل استبدال أي قطعة.",
    icon: ScanLine,
    steps: [
      {
        title: "سجّل الكود وبيانات التجميد",
        detail:
          "اكتب الكود ورقم الهيكل (VIN) والطراز والسنة. إن كان القارئ يعرض Freeze Frame، سجّل السرعة والحمل وحرارة المحرك قبل مسح أي كود.",
      },
      {
        title: "افتح دليل الأكواد وابحث عن P0301",
        detail:
          "من القائمة العلوية ادخل إلى «أكواد OBD»، ثم اكتب P0301 في مربع البحث. يمكنك أيضاً فتح تبويب P وتصفية الخطورة إلى «مرتفع» لرؤية الأعطال العاجلة.",
      },
      {
        title: "اقرأ بطاقة الكود بالترتيب",
        detail:
          "ابدأ بالمعنى ثم الأسباب المحتملة، واتبع خطوات التشخيص من الأرخص إلى الأغلى. راجع النظام المرتبط والأكواد المشابهة قبل الانتقال إلى القياس.",
      },
      {
        title: "تحقّق من المصادر الإضافية",
        detail:
          "افتح مصدراً واحداً من قسم «مصادر إضافية» وقارن تعريف الكود وإجراء الفحص. لا تعتمد على مصدر واحد إن كان الكود خاصاً بالصانع.",
      },
      {
        title: "اطبع بطاقة الورشة",
        detail:
          "اضغط «طباعة البطاقة» لتحصل على نسخة بالأبيض والأسود تتضمن الكود والخطورة وأهم الأسباب والخطوات. خذها معك إلى الورشة.",
      },
    ],
    screenshot: "لقطة شاشة: دليل الأكواد بعد كتابة P0301، مع بطاقة الكود وشارة الخطورة",
    outcome:
      "تخرج بفهم واضح للكود، وقائمة فحوص مرتبة، وبطاقة مطبوعة. لا تكون قد اشتريت بوجيهات أو كويل بناءً على تخمين.",
  },
  {
    id: "brake-sources",
    eyebrow: "الحالة الثانية",
    title: "أريد مصادر لإصلاح فرامل — كيف أجد؟",
    intro:
      "الفرامل ليست تصنيفاً مستقلاً في المنصة: أنظمة ABS تظهر تحت الكهرباء، وإجراءات الإصلاح العامة تحت أدلة الإصلاح. لذلك ابدأ بالبحث النصي ثم ضيّق النتائج.",
    icon: Search,
    steps: [
      {
        title: "ابدأ بالبحث النصي",
        detail:
          "من صفحة البحث اكتب «فرامل»، ثم جرّب «مكابح» و«brake» و«ABS». البحث يشمل اسم المصدر ووصفه، وقد يعطيك نتائج مختلفة بكل مصطلح.",
      },
      {
        title: "أضف بحث ABS للأكواد",
        detail:
          "افتح دليل أكواد OBD وابحث عن C0035 أو تصفّح مجموعة C (العجلات). أكواد C تغطي حساسات ABS ودوائر الفرامل المانعة للانغلاق.",
      },
      {
        title: "صفِّ حسب المهمة",
        detail:
          "في صفحة المصادر اختر المهمة «تشخيص» أو «دليل إصلاح»، ثم اللغة التي تستطيع قراءتها. هذا يقلّل النتائج إلى ما يناسب مهمتك فعلاً.",
      },
      {
        title: "افتح بطاقة المصدر وتحقّق",
        detail:
          "راجع اللغة وحالة الرابط وتغطية الطراز. تأكد هل المصدر يشرح الفرامل الهيدروليكية أم ABS فقط، ولا تفترض أنه يغطي سيارتك لمجرد ذكر «brake».",
      },
      {
        title: "اجمع مصدراً واحداً وكوداً واحداً",
        detail:
          "احفظ دليل إصلاح واحداً مناسباً، وافتح بطاقة C0035 لفهم دائرة الحساس. إن كان الرابط معطلاً، أبلغنا من صفحة «عن المنصة».",
      },
    ],
    screenshot: "لقطة شاشة: نتائج البحث عن «فرامل» مع فلاتر المهمة واللغة وبطاقات المصادر",
    outcome:
      "تصل إلى مصدر إصلاح واحد ودليل كود ABS واحد، بدل قائمة روابط عامة لا تعرف أيها يخص الفرامل.",
  },
  {
    id: "compare-ecu",
    eyebrow: "الحالة الثالثة",
    title: "أريد مقارنة مصادر برمجة ECU — كيف؟",
    intro:
      "برمجة وحدة التحكم مكلفة ومحفوفة بالمخاطر. لا تختر المصدر من أول نتيجة: قارن التغطية والأدوات واللغة والتحذيرات قبل أي عملية كتابة.",
    icon: Cpu,
    steps: [
      {
        title: "افتح مهمة برمجة ECU",
        detail:
          "من صفحة المصادر اختر المهمة «برمجة ECU». ستجد قواعد بينات وأدلة ترميز وأدوات، وكلها مرتبطة بنظام الكهرباء والإلكترونيات.",
      },
      {
        title: "افتح مصدرين أو ثلاثة في تبويبات",
        detail:
          "اختر مصادر تغطي نفس الطراز أو نفس عائلة المحرك. لا تقارن مصدراً لسيارة أوروبية بمصدر يخص طرازاً آسيوياً مختلفاً.",
      },
      {
        title: "قارن ستة معايير",
        detail:
          "غطاء الطراز والمحرك، توافق الأداة والبروتوكول، اللغة، تاريخ التحديث، وجود حساب أو تكلفة، وتحذيرات النسخ الاحتياطي. سجّل النتيجة في جدول قصير.",
      },
      {
        title: "راجع دليل الكهرباء أولاً",
        detail:
          "افتح دليل «الكهرباء والإلكترونيات» لمراجعة مصطلحات ECU وCAN والترميز. المصطلح الصحيح يمنعك من اختيار ملف غير متوافق.",
      },
      {
        title: "سجّل القرار قبل الشراء",
        detail:
          "احتفظ بروابط المصادر وملاحظات المقارنة. فضّل مصدر الصانع أو وكيله عند توفرها، وتجنّب الملفات المنسوخة مجهولة المصدر.",
      },
    ],
    screenshot: "لقطة شاشة: بطاقتا مصدر لبرمجة ECU مفتوحتان للمقارنة في تبويبين",
    outcome:
      "تخرج بمقارنة مكتوبة بين مصدرين، وتعرف أي أداة وملف يناسب طرازك قبل دفع ثمن اشتراك أو مخاطرة بوحدة تحكم.",
  },
];

export default function HowToUsePage() {
  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "كيف تستعمل المنصة",
            description:
              "ثلاث حالات عملية لاستخدام الدليل: تشخيص كود، إصلاح فرامل، ومقارنة مصادر برمجة.",
            path: "/how-to-use",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "كيف تستعمل المنصة", path: "/how-to-use" },
          ]),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs items={[{ label: "كيف تستعمل المنصة" }]} />
          <div className="mt-5 max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
              دليل الاستعمال
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              ثلاث حالات، وطريق واحد واضح
            </h1>
            <p className="mt-4 text-sm leading-8 text-muted-strong sm:text-base">
              لا تحتاج إلى معرفة كل المنصة. اختر الحالة التي تشبه موقفك الآن،
              واتبع الخطوات بالترتيب. كل حالة تنتهي بنتيجة ملموسة: فهم الكود،
              مصدر مناسب للفرامل، أو مقارنة جاهزة لمصادر برمجة ECU.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SCENARIOS.map((scenario) => (
                <a
                  key={scenario.id}
                  href={`#${scenario.id}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                >
                  <MonitorPlay className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                  {scenario.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <div className="space-y-8">
          {SCENARIOS.map((scenario, index) => {
            const Icon = scenario.icon;
            return (
              <article
                key={scenario.id}
                id={scenario.id}
                className="surface-card scroll-mt-24 overflow-hidden"
              >
                <div className="border-b border-line bg-surface-raised/40 p-5 sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-400">
                          {scenario.eyebrow}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                          {scenario.title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
                          {scenario.intro}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-3xl font-extrabold text-line">
                      0{index + 1}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                  <ol className="space-y-4">
                    {scenario.steps.map((step, stepIndex) => (
                      <li key={step.title} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[11px] font-extrabold tabular-nums text-accent-300 ring-1 ring-inset ring-accent/20">
                          {stepIndex + 1}
                        </span>
                        <div>
                          <h3 className="text-xs font-extrabold text-white">{step.title}</h3>
                          <p className="mt-1 text-[11px] leading-6 text-muted">{step.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="space-y-3">
                    <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-sunken/50 p-5 text-center">
                      <ImageIcon className="h-6 w-6 text-muted/50" aria-hidden="true" />
                      <p className="mt-2 text-[10px] font-semibold leading-5 text-muted">
                        {scenario.screenshot}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-wide text-muted/50">
                        Screenshot placeholder
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4">
                      <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        النتيجة المتوقعة
                      </h3>
                      <p className="mt-1.5 text-[11px] leading-6 text-muted-strong">
                        {scenario.outcome}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/obd-codes"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-background transition-opacity hover:opacity-90"
          >
            ابدأ بدليل الأكواد
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/categories"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            تصفّح الأنظمة
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            عن المنصة والتواصل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
