"use client";

/**
 * File: app/error.tsx
 * Purpose: Arabic recovery screen for unexpected server/client errors.
 */

import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-inset ring-danger/20">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-white sm:text-3xl">
        حدث خطأ غير متوقع
      </h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">
        تعذّر تحميل هذا القسم. أعد المحاولة، وإذا استمرت المشكلة عد إلى الصفحة
        الرئيسية.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-muted/60" dir="ltr">
          {error.digest}
        </p>
      ) : null}
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
