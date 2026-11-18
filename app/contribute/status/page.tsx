"use client";

/**
 * File: app/contribute/status/page.tsx
 * Purpose: Public tracking-number lookup. Accepts either the numeric id or the
 * SUB-YYYY-NNNNNN reference printed after submission.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";

export default function StatusLookupPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = reference.trim();
    if (!value) {
      setError("أدخل رقم المتابعة أولاً.");
      return;
    }
    if (!/^(?:\d{1,12}|SUB-\d{4}-\d{1,12})$/i.test(value)) {
      setError("صيغة رقم المتابعة غير صحيحة. مثال: SUB-2026-000123");
      return;
    }
    setError(null);
    router.push(`/contribute/status/${encodeURIComponent(value)}`);
  }

  return (
    <main id="main" className="flex-1">
      <section className="container-page flex min-h-[60vh] items-center py-10">
        <div className="mx-auto w-full max-w-xl">
          <div className="surface-card p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-white">
              متابعة اقتراح
            </h1>
            <p className="mt-2 text-[11px] leading-6 text-muted">
              أدخل رقم المتابعة الذي ظهر بعد إرسال الاقتراح، أو رقمه الرقمي.
              لا نطلب بريدك للاطلاع على الحالة.
            </p>

            <form onSubmit={handleSubmit} className="mt-5">
              <label htmlFor="tracking" className="block text-[11px] font-bold text-white">
                رقم المتابعة
              </label>
              <input
                id="tracking"
                type="text"
                dir="ltr"
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="SUB-2026-000123"
                autoComplete="off"
                aria-invalid={Boolean(error)}
                aria-describedby="tracking-help"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 font-mono text-base font-bold text-white placeholder:text-sm placeholder:font-medium placeholder:text-muted/60 focus:border-accent/50"
              />
              <p id="tracking-help" className="mt-1 min-h-5 text-[10px] leading-5">
                {error ? (
                  <span className="text-danger">{error}</span>
                ) : (
                  <span className="text-muted">
                    يقبل أيضاً الرقم فقط، مثل 123.
                  </span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background shadow-accent-glow"
                >
                  اعرض الحالة
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <Link
                  href="/contribute"
                  className="inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
                >
                  اقتراح جديد
                </Link>
              </div>
            </form>

            <p className="mt-5 flex items-start gap-1.5 border-t border-line pt-4 text-[10px] leading-5 text-muted">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
              صفحة الحالة تعرض اسم المصدر وحالته وملاحظة المراجع فقط. لا تعرض
              بريدك أو عنوان IP.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
