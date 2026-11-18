/**
 * File: components/layout/Breadcrumbs.tsx
 * Purpose: RTL breadcrumb trail for category, source, OBD, and search pages.
 */

import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="مسار التنقل"
      className={cn("flex flex-wrap items-center gap-1 text-[11px]", className)}
    >
      <Link
        href="/"
        aria-label="الصفحة الرئيسية"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-white"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            <ChevronLeft className="h-3 w-3 shrink-0 text-muted/50" aria-hidden="true" />
            {item.href && !last ? (
              <Link
                href={item.href}
                className="max-w-[12rem] truncate rounded px-1 py-0.5 text-muted transition-colors hover:text-accent-300"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={cn(
                  "max-w-[16rem] truncate px-1 py-0.5",
                  last ? "font-semibold text-muted-strong" : "text-muted",
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
