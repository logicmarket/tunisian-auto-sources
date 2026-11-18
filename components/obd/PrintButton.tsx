"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "طباعة البطاقة" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
    >
      <Printer className="h-4 w-4 text-accent-400" aria-hidden="true" />
      {label}
    </button>
  );
}
