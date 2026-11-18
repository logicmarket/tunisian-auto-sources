/**
 * File: app/about/page.tsx
 * Purpose: Explains the portal, its classification method, data
 * transparency, and how to suggest a source or report a broken link.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Database,
  Globe2,
  Layers,
  Mail,
  MessageCircle,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ContactForm } from "@/components/about/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getObdCount } from "@/lib/obd";
import {
  getCategoryCounts,
  getLastVerifiedDate,
  getPortalStats,
} from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata, webPageJsonLd } from "@/lib/seo";
import { formatArabicDate, formatNumber } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "عن المنصة",
  description:
    "تعرّف على بوابة مصادر السيارات التونسية: لمن صُممت، كيف نختار المصادر ونصنّفها، وكيف ترسل اقتراحاً أو تبلّغ عن رابط معطّل.",
  path: "/about",
  keywords: [
    "عن المنصة",
    "مصادر السيارات التونسية",
    "منهجية التصنيف",
    "اقتراح مصدر",
    "الإبلاغ عن رابط",
  ],
});

const METHOD = [
  {
    title: "حسب نظام السيارة",
    description:
      "كل مصدر مرتبط بنظام واحد رئيسي: المحرك، الكهرباء، الناقل، التبريد، أو غيرها. هذا يمنع خلط المصادر العامة بالمصادر المتخصصة.",
    icon: Layers,
  },
  {
    title: "حسب نوع المهمة",
    description:
      "المهمة تحدد ما يقدمه المصدر: تشخيص، دليل إصلاح، برمجة ECU، قطع غيار، أدوات، أو مرجع تعلّمي.",
    icon: Wrench,
  },
  {
    title: "حسب اللغة والحالة",
    description:
      "نذكر لغة المحتوى ونفحص حالة الرابط دورياً. الروابط المحوّلة أو غير المؤكدة تظهر بوضوح حتى تعرف ما تتوقعه.",
    icon: Globe2,
  },
];

const QUALITY = [
  {
    title: "لا نختلق كوداً",
    description:
      "كل كود في القاعدة موجود فعلاً في نطاقات ISO 15031-6 / SAE J2012 أو في قائمة صانع موثقة. لا نضيف أكواداً «تقريبية» لملء العدد.",
    icon: BadgeCheck,
  },
  {
    title: "تمييز المؤكد من غيره",
    description:
      "الأكواد العامة تحمل عبارة VERIFIED، أما أكواد الصانع التي يختلف معناها بين الطرازات فتحمل UNVERIFIED مع ملاحظة المصدر.",
    icon: ShieldCheck,
  },
  {
    title: "محتوى تقني قابل للتنفيذ",
    description:
      "كل كود يعرض الأسباب المحتملة، خطوات فحص مرتبة من الأرخص إلى الأغلى، درجة خطورة، ونظاماً مرتبطاً. لا نكتفي بترجمة اسم الكود.",
    icon: BookOpen,
  },
  {
    title: "تحديث ومراجعة",
    description:
      "نراجع الأوصاف والأدلة عند اكتشاف خطأ أو عند تغيّر مصدر. تُسجَّل آخر مراجعة للروابط وتظهر للمستخدم بدل إخفائها.",
    icon: CalendarCheck,
  },
];

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@tunisia-auto.tn";
const CONTACT_WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP ?? "+216 55 000 000";
const WHATSAPP_URL = `https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, "")}`;

export default async function AboutPage() {
  const [stats, categories, obdCount, lastVerified] = await Promise.all([
    getPortalStats(),
    getCategoryCounts(),
    getObdCount(),
    getLastVerifiedDate(),
  ]);

  const metrics = [
    {
      label: "مصدر منشور",
      value: formatNumber(stats.totalSources),
      icon: Database,
    },
    {
      label: "رابط نشط",
      value: formatNumber(stats.liveSources),
      icon: CheckCircle2,
    },
    {
      label: "تصنيف رئيسي",
      value: formatNumber(stats.systemCount),
      icon: Layers,
    },
    {
      label: "كود OBD",
      value: formatNumber(obdCount),
      icon: BookOpen,
    },
  ];

  return (
    <main id="main" className="flex-1">
      <JsonLd
        data={[
          webPageJsonLd({
            name: "عن المنصة",
            description:
              "منهجية اختيار وتصنيف مصادر السيارات التونسية وطرق التواصل.",
            path: "/about",
            type: "AboutPage",
          }),
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "عن المنصة", path: "/about" },
          ]),
        ]}
      />
      <section className="relative isolate overflow-hidden border-b border-line/60">
        <div
          className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
        />
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs items={[{ label: "عن المنصة" }]} />

          <div className="mt-5 max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
              من نحن
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              دليل الورشة التونسية، بلا ضوضاء
            </h1>
            <p className="mt-4 text-sm leading-8 text-muted-strong sm:text-base">
              بوابة مصادر السيارات التونسية مبادرة مستقلة تجمع مصادر تشخيص
              وإصلاح السيارات في مكان واحد، وتصنّفها بطريقة تناسب طريقة عمل
              الميكانيكي: النظام أولاً، ثم المهمة. لا حسابات، لا إعلانات، ولا
              روابط عشوائية.
            </p>
            <p className="mt-3 text-sm leading-8 text-muted">
              صُممت الواجهة للهاتف أولاً، بالعربية ومن اليمين إلى اليسار، لأن
              معظم الوقت تُقرأ المصادر بيد واحدة وبجانب السيارة.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="surface-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted">
                      {metric.label}
                    </span>
                    <Icon className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums text-white">
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="المهمة"
          title="مهمتنا"
          description="لماذا وُجد هذا الدليل، وما الذي نحاول تغييره في ورشة السيارات التونسية."
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="surface-card p-5 sm:p-6">
            <p className="text-sm leading-8 text-muted-strong">
              هدفنا أن يجد الميكانيكي والكهربائي في تونس مصدراً تقنياً واحداً
              موثوقاً بدل عشرة روابط متفرقة، وأن يفهم كود العطل قبل أن يشتري
              قطعة غيار بناءً على تخمين. المنصة مجانية، بلا حسابات ولا إعلانات،
              وتعرض المصادر بلغاتها الأصلية مع شرح عربي واضح.
            </p>
            <p className="mt-3 text-sm leading-8 text-muted">
              نركّز على الطرازات المنتشرة في السوق التونسية والمركبات المستعملة
              المستوردة، لأن كثيراً من الأدلة المتوفرة بالفرنسية أو الإنجليزية
              تفترض طرازاً أو محركاً مختلفاً. لذلك نربط كل مصدر بنظام ومهمة
              ولغة، ونذكر حالة الرابط بدل إخفائها.
            </p>
          </div>

          <div className="surface-card flex flex-col justify-center gap-3 p-5 sm:p-6">
            {[
              "مصادر مجانية أو متاحة للورشات الصغيرة",
              "شرح عربي قابل للتنفيذ، لا ترجمة حرفية",
              "تمييز واضح بين المعلومة المؤكدة وغير المؤكدة",
              "روابط تُراجع دورياً، وتصحيح مفتوح للجميع",
            ].map((item) => (
              <p key={item} className="flex items-start gap-2 text-xs leading-6 text-muted-strong">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-10 sm:pb-14">
        <SectionHeading
          eyebrow="المنهجية"
          title="كيف نصنّف المصادر"
          description="ثلاث طبقات فقط، لكنها كافية لتصل إلى ما تحتاجه في نقرتين."
        />

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {METHOD.map((method) => {
            const Icon = method.icon;
            return (
              <article key={method.title} className="surface-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-extrabold text-white">
                  {method.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {method.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-white">
                شفافية البيانات
              </h2>
              <p className="mt-1.5 text-xs leading-7 text-muted-strong">
                كل عدد تراه في المنصة يُقرأ مباشرة من قاعدة البيانات، وليس رقماً
                تسويقياً. نعرض الروابط النشطة والمحوّلة وغير المؤكدة كما هي،
                ونحدّث حالة الروابط دورياً.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip">
                  <Database className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                  {formatNumber(categories.total)} سجل مصدر
                </span>
                <span className="chip">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                  {formatNumber(stats.liveSources)} رابط نشط
                </span>
                <span className="chip">
                  <CalendarCheck className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                  آخر تحديث للروابط: {formatArabicDate(lastVerified)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-sunken/40 py-10 sm:py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="معايير الجودة"
            title="كيف نضمن أن المعلومة تستحق الثقة"
            description="أربعة معايير نطبقها على كل كود ومصدر قبل النشر، ونراجعها عند أي تصحيح."
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {QUALITY.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="surface-card p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold text-white">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-sunken/40 py-10 sm:py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="ساهم معنا"
            title="أضف مصدراً أو صحّح معلومة"
            description="هل تعرف مصدراً يستحق أن يكون هنا؟ هل وجدت رابطاً معطلاً أو وصفاً غير دقيق؟ أرسل لنا وسنراجعه."
          />

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div id="contact" className="scroll-mt-24">
              <ContactForm />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="surface-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <Mail className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  ماذا ترسل؟
                </h3>
                <ul className="mt-3 space-y-2.5 text-xs leading-6 text-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    اقتراح مصدر جديد مع الرابط ووصف قصير.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    رابط لا يعمل أو يفتح صفحة مختلفة.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    تصحيح تصنيف أو وصف عربي.
                  </li>
                </ul>
              </div>

              <div className="surface-card p-5">
                <h3 className="text-sm font-extrabold text-white">قبل الإرسال</h3>
                <p className="mt-2 text-[11px] leading-6 text-muted">
                  تأكد أن الرابط يعمل وأن المحتوى موجّه فعلاً للسيارات. لا ترسل
                  كلمات مرور أو بيانات شخصية أو محتوى مقرصناً.
                </p>
              </div>

              <div className="surface-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <MessageCircle className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  تواصل مباشر
                </h3>
                <div className="mt-3 space-y-2">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                    <span dir="ltr">{CONTACT_EMAIL}</span>
                  </a>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-raised/50 px-3 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                    واتساب: <span dir="ltr">{CONTACT_WHATSAPP}</span>
                  </a>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-muted/70">
                  للاقتراحات والتصحيحات فقط. لا ترسل بيانات شخصية أو صوراً خاصة.
                </p>
              </div>

              <Link
                href="/sources"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                تصفّح المصادر الحالية
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
