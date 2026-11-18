"use client";

/**
 * File: components/phase4/FirstTimeBanner.tsx
 * Purpose: Dismissible first-run guidance used by the diagnosis tool and the
 * personal dashboard. Dismissal is remembered in localStorage.
 */

import { Info, X } from "lucide-react";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";

interface FirstTimeBannerProps {
  guide: "diagnosis" | "dashboard";
  title: string;
  children: React.ReactNode;
}

export function FirstTimeBanner({
  guide,
  title,
  children,
}: FirstTimeBannerProps) {
  const { isGuideDismissed, dismissGuide } = useBookmarks();
  if (isGuideDismissed(guide)) return null;

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-200">
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white">{title}</p>
          <div className="mt-1 text-[11px] leading-6 text-muted-strong">
            {children}
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismissGuide(guide)}
          aria-label="إغلاق التلميح"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
