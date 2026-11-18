/**
 * File: app/my-sources/page.tsx
 * Purpose: Personal dashboard shell. All data lives in localStorage, so the
 * page itself is static and the client component owns loading and exports.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, HardDrive, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MySourcesDashboard } from "@/components/phase4/dashboard/MySourcesDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مساحتي الشخصية",
  description:
    "مفضلة المصادر وتقييماتك ومقارنة المصادر محفوظة محلياً في متصفحك، بدون حساب.",
  alternates: { canonical: "/my-sources" },
  robots: { index: false, follow: true },
};

export default function MySourcesPage() {
  return (
    <main id="main" className="dashboard-page flex-1">
      <section className="border-b border-line/60 print:hidden">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "مساحتي الشخصية" },
            ]}
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                <HardDrive className="h-3 w-3" aria-hidden="true" />
                بدون حساب
              </p>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
                مساحتي الشخصية
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-strong">
                احفظ المصادر التي تعتمدها، سجّل تقييمك، وقارن بين أربعة مصادر
                جانباً إلى جانب. كل ذلك يُخزَّن في متصفحك فقط.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <p className="text-[10px] leading-6 text-muted">
                  لا نجمع بريدك ولا ننشئ حساباً. بياناتك لا تغادر جهازك.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
                <p className="text-[10px] leading-6 text-muted">
                  صدّر نسخة JSON قبل تنظيف بيانات المتصفح.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/sources"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              تصفّح المصادر
              <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            </Link>
            <Link
              href="/tools/diagnosis"
              className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              التشخيص الموجّه
              <ArrowLeft className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-content container-page py-8 sm:py-10">
        <MySourcesDashboard />
      </section>
    </main>
  );
}
