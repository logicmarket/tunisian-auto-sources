/**
 * File: components/ui/Pagination.tsx
 * Purpose: RTL-aware pagination with previous/next controls, numbered
 * pages, ellipses, and an "عرض X من Y" summary. Rendered on the server so
 * every page is linkable and works without JavaScript.
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  query?: Record<string, string | undefined>;
  className?: string;
}

function buildHref(
  basePath: string,
  query: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

function pageNumbers(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  query = {},
  className,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  const pages = pageNumbers(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className={cn(
        "mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      aria-label="التنقل بين صفحات النتائج"
    >
      <p className="text-center text-xs text-muted sm:text-start">
        عرض{" "}
        <span className="font-bold tabular-nums text-muted-strong">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{" "}
        من{" "}
        <span className="font-bold tabular-nums text-muted-strong">
          {formatNumber(totalItems)}
        </span>{" "}
        مصدر
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <PageArrow
          href={buildHref(basePath, query, currentPage - 1)}
          disabled={!hasPrev}
          label="السابق"
          icon="prev"
        />

        {pages.map((page, index) =>
          page === "gap" ? (
            <span
              key={`gap-${index}`}
              className="px-1 text-xs text-muted"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildHref(basePath, query, page)}
              aria-label={`الصفحة ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold tabular-nums transition-colors",
                page === currentPage
                  ? "border-accent bg-accent text-background"
                  : "border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white",
              )}
            >
              {page}
            </Link>
          ),
        )}

        <PageArrow
          href={buildHref(basePath, query, currentPage + 1)}
          disabled={!hasNext}
          label="التالي"
          icon="next"
        />
      </div>
    </nav>
  );
}

function PageArrow({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: "prev" | "next";
}) {
  const Icon = icon === "prev" ? ChevronRight : ChevronLeft;
  const classes =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-muted-strong transition-colors";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(classes, "cursor-not-allowed opacity-40")}
      >
        {icon === "prev" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {label}
        {icon === "next" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      </span>
    );
  }

  return (
    <Link
      href={href}
      rel={icon === "prev" ? "prev" : "next"}
      className={cn(classes, "hover:border-accent/40 hover:text-white")}
    >
      {icon === "prev" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {label}
      {icon === "next" ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}
