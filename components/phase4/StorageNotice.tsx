"use client";

/**
 * File: components/phase4/StorageNotice.tsx
 * Purpose: Clear Arabic warning when localStorage is blocked (private mode).
 */

import { AlertTriangle } from "lucide-react";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";

export function StorageNotice() {
  const { storageAvailable, storageError } = useBookmarks();
  if (storageAvailable || !storageError) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-400/25 bg-amber-400/10 print:hidden"
    >
      <div className="container-page flex items-start gap-2 py-2.5 text-[11px] leading-6 text-amber-100">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
          aria-hidden="true"
        />
        <p>{storageError}</p>
      </div>
    </div>
  );
}
