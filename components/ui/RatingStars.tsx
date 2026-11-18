/**
 * File: components/ui/RatingStars.tsx
 * Purpose: Accessible, dependency-free star rating display used on cards
 * and the source detail page.
 */

import { Star } from "lucide-react";
import { cn, formatRating } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

export function RatingStars({
  rating,
  count,
  size = "sm",
  showValue = true,
  className,
}: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const rounded = Math.round(clamped);
  const starClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`التقييم ${formatRating(clamped)} من 5${
        typeof count === "number" ? ` بناءً على ${count} تقييم` : ""
      }`}
    >
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starClass,
              star <= rounded
                ? "fill-accent text-accent"
                : "fill-transparent text-line",
            )}
          />
        ))}
      </div>
      {showValue ? (
        <span className="text-[11px] font-semibold tabular-nums text-muted">
          {formatRating(clamped)}
          {typeof count === "number" ? (
            <span className="text-muted/70"> ({count})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
