/**
 * File: app/not-found.tsx
 * Purpose: Arabic 404 page. The root layout already provides the header and
 * footer, so this file only renders the missing-page message.
 */

import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main"
      className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
        <Wrench className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-6 font-mono text-sm font-bold text-accent-400" dir="ltr">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">
        قد يكون الرابط قديماً أو أن المصدر لم يعد منشوراً. عد إلى الصفحة
        الرئيسية، أو ابحث في الدليل عن ما تحتاجه.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          العودة إلى الرئيسية
        </Link>
        <Link
          href="/sources"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
        >
          تصفّح كل المصادر
        </Link>
      </div>
    </main>
  );
}
