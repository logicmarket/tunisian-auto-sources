/**
 * File: app/admin/link-health/page.tsx
 * Purpose: Link-health console. Not linked from public navigation, excluded
 * from indexing, token-gated in the client component (same ADMIN_TOKEN as the
 * submissions inbox).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2, ShieldAlert } from "lucide-react";
import { LinkHealthDashboard } from "@/components/admin/LinkHealthDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "صحة الروابط",
  robots: { index: false, follow: false },
};

export default function LinkHealthPage() {
  return (
    <main id="main" className="flex-1">
      <section className="container-page py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              منطقة إدارة
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-white sm:text-3xl">
              <Link2 className="h-6 w-6 text-accent-400" aria-hidden="true" />
              صحة الروابط الخارجية
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-muted">
              فحص دوري لكل رابط مصدر، مع سجل كامل في <code className="text-accent-300">link_reports</code>.
              الفحص التلقائي لا يحذف شيئاً: الروابط المعطّلة تُراجع يدوياً قبل الإخفاء أو الحذف.
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
          <LinkHealthDashboard devMode={process.env.NODE_ENV !== "production"} />
        </div>
      </section>
    </main>
  );
}
