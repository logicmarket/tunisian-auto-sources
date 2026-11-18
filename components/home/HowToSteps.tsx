/**
 * File: components/home/HowToSteps.tsx
 * Purpose: Three-step quick start for first-time visitors. Written for a
 * mechanic holding a phone in one hand: short verbs, one action per step.
 */

import Link from "next/link";
import { ArrowLeft, Layers, ListFilter, ExternalLink, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "اختر النظام",
    description:
      "ابدأ من نظام السيارة الذي تعمل عليه: المحرك، الكهرباء، الناقل، أو التبريد.",
    icon: Layers,
  },
  {
    number: "02",
    title: "صفِّ حسب المهمة",
    description:
      "حدّد ما تحتاجه الآن: تشخيص، دليل إصلاح، برمجة ECU، أو قطع غيار.",
    icon: ListFilter,
  },
  {
    number: "03",
    title: "افتح المصدر",
    description:
      "راجع حالة الرابط والتقييم، ثم افتح المصدر في تبويب جديد وابدأ العمل.",
    icon: ExternalLink,
  },
];

export function HowToSteps() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="grid gap-px bg-line sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="relative bg-surface p-5 sm:p-6">
              <span className="font-mono text-[11px] font-extrabold tracking-widest text-accent-400/80">
                {step.number}
              </span>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-extrabold text-white">{step.title}</h3>
              </div>
              <p className="mt-3 text-xs leading-6 text-muted">{step.description}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-surface-sunken/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Wrench className="h-4 w-4 text-accent-400" aria-hidden="true" />
          كل شيء مجاني للتصفح، ولا حاجة إلى حساب.
        </div>
        <Link
          href="/categories"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90"
        >
          ابدأ الآن
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
