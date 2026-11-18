/**
 * File: app/contribute/status/[id]/page.tsx
 * Purpose: Public, privacy-safe tracking page. Displays status, dates and the
 * reviewer note, and links to the published source after approval.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Search,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getSubmissionByTracking } from "@/lib/phase4/submissions";
import { cn, formatArabicDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface StatusPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: StatusPageProps): Promise<Metadata> {
  const submission = await getSubmissionByTracking(decodeURIComponent(params.id));
  return {
    title: submission
      ? `حالة الاقتراح ${submission.trackingId}`
      : "متابعة اقتراح",
    robots: { index: false, follow: false },
  };
}

const STATUS_META = {
  pending: {
    label: "قيد المراجعة",
    description: "استلمنا اقتراحك وهو في انتظار مراجعة يدوية من الفريق.",
    icon: Clock3,
    tone: "border-amber-400/30 bg-amber-400/[0.08] text-amber-200",
    step: 1,
  },
  approved: {
    label: "تمت الموافقة",
    description: "تم التحقق من المصدر ونشره في بوابة المصادر.",
    icon: CheckCircle2,
    tone: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300",
    step: 2,
  },
  rejected: {
    label: "لم يُعتمد",
    description: "راجعنا الاقتراح ولم نتمكن من اعتماده في الوقت الحالي.",
    icon: XCircle,
    tone: "border-danger/30 bg-danger/[0.08] text-danger",
    step: 2,
  },
} as const;

export default async function SubmissionStatusPage({ params }: StatusPageProps) {
  const reference = decodeURIComponent(params.id).trim();
  const submission = await getSubmissionByTracking(reference);
  if (!submission) notFound();

  const meta = STATUS_META[submission.status];
  const StatusIcon = meta.icon;

  return (
    <main id="main" className="flex-1">
      <section className="container-page py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "أضف مصدراً", href: "/contribute" },
            { label: "حالة الاقتراح" },
          ]}
        />

        <div className="mx-auto mt-5 max-w-2xl space-y-4">
          <div className={cn("rounded-2xl border p-5 sm:p-6", meta.tone)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
                  رقم المتابعة
                </p>
                <p className="mt-1 font-mono text-lg font-extrabold tracking-wider" dir="ltr">
                  {submission.trackingId}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1.5 text-[11px] font-extrabold">
                <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {meta.label}
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-6 opacity-90">{meta.description}</p>
          </div>

          <div className="surface-card p-5 sm:p-6">
            <h1 className="text-lg font-extrabold text-white">{submission.name}</h1>
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
            >
              <span className="truncate">{submission.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>

            <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold text-muted">تاريخ الإرسال</dt>
                <dd className="mt-0.5 text-xs font-bold text-muted-strong">
                  {formatArabicDate(submission.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-muted">تاريخ المراجعة</dt>
                <dd className="mt-0.5 text-xs font-bold text-muted-strong">
                  {submission.reviewedAt
                    ? formatArabicDate(submission.reviewedAt)
                    : "لم تتم بعد"}
                </dd>
              </div>
            </dl>

            {submission.reviewerNote ? (
              <div className="mt-4 rounded-xl border border-line bg-surface-raised/60 p-3">
                <p className="text-[10px] font-bold text-muted">ملاحظة المراجع</p>
                <p className="mt-1 text-[11px] leading-6 text-muted-strong">
                  {submission.reviewerNote}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {submission.status === "approved" && submission.publishedSourceId ? (
                <Link
                  href={`/sources/${submission.publishedSourceId}`}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
                >
                  افتح صفحة المصدر
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link
                href="/contribute/status"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
              >
                <Search className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                متابعة اقتراح آخر
              </Link>
              <Link
                href="/contribute"
                className="inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
              >
                إرسال اقتراح جديد
              </Link>
            </div>
          </div>

          <p className="text-center text-[10px] leading-5 text-muted/80">
            هذه الصفحة لا تعرض بريدك أو عنوان IP. إن أردت حذف اقتراحك، راسلنا عبر
            صفحة «عن المنصة» مع رقم المتابعة.
          </p>
        </div>
      </section>
    </main>
  );
}
