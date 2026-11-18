/**
 * File: app/admin/submissions/page.tsx
 * Purpose: Token-gated review inbox. Not linked from public navigation and
 * excluded from indexing. All logic lives in the client component.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { SubmissionReview } from "@/components/phase4/admin/SubmissionReview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مراجعة الاقتراحات",
  robots: { index: false, follow: false },
};

export default function AdminSubmissionsPage() {
  return (
    <main id="main" className="flex-1">
      <section className="container-page py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              منطقة إدارة
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              مراجعة اقتراحات المصادر
            </h1>
            <p className="mt-1 text-xs leading-6 text-muted">
              اعتماد ينشر المصدر مباشرة في القاعدة ويولّد رابطاً. الرفض يحفظ
              الملاحظة ويُعلم صاحب الاقتراح إن أُدخل بريد.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[11px] font-bold text-muted-strong hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            عودة للمنصة
          </Link>
        </div>

        <div className="mt-6">
          <SubmissionReview devMode={process.env.NODE_ENV !== "production"} />
        </div>
      </section>
    </main>
  );
}
