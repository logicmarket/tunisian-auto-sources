"use client";

/**
 * File: components/sources/SourceFeedback.tsx
 * Purpose: Interactive star rating and "was this useful?" widget for the
 * source detail page. Posts to the feedback API and remembers this
 * browser's choice locally.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import type { SourceFeedbackSummary } from "@/lib/types";
import { cn, formatNumber, formatRating } from "@/lib/utils";

interface SourceFeedbackProps {
  sourceId: number;
  initialSummary: SourceFeedbackSummary;
}

type FeedbackKind = "rating" | "helpful";

export function SourceFeedback({ sourceId, initialSummary }: SourceFeedbackProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [myRating, setMyRating] = useState(0);
  const [myVote, setMyVote] = useState<0 | 1 | -1>(0);
  const [hovered, setHovered] = useState(0);
  const [pending, setPending] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratingKey = `tas-rating-${sourceId}`;
  const voteKey = `tas-helpful-${sourceId}`;

  useEffect(() => {
    try {
      const storedRating = Number(window.localStorage.getItem(ratingKey));
      if (Number.isInteger(storedRating) && storedRating >= 1 && storedRating <= 5) {
        setMyRating(storedRating);
      }
      const storedVote = Number(window.localStorage.getItem(voteKey));
      if (storedVote === 1 || storedVote === -1) {
        setMyVote(storedVote);
      }
    } catch {
      // Local storage is optional.
    }
  }, [ratingKey, voteKey]);

  async function send(kind: FeedbackKind, value: number) {
    setPending(kind);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/sources/${sourceId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, value }),
      });
      const payload = (await response.json()) as {
        summary?: SourceFeedbackSummary;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "تعذر حفظ التقييم.");
      }

      setSummary(payload.summary);
      setMessage(payload.message ?? "شكراً لك، تم تسجيل تقييمك.");

      if (kind === "rating") {
        setMyRating(value);
        window.localStorage.setItem(ratingKey, String(value));
      } else {
        setMyVote(value as 1 | -1);
        window.localStorage.setItem(voteKey, String(value));
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر حفظ التقييم. حاول مرة أخرى.",
      );
    } finally {
      setPending(null);
    }
  }

  const displayRating = hovered || myRating;

  return (
    <section
      aria-labelledby="feedback-title"
      className="surface-card p-5 sm:p-6"
    >
      <h2 id="feedback-title" className="text-base font-extrabold text-white">
        قيّم هذا المصدر
      </h2>
      <p className="mt-1.5 text-xs leading-6 text-muted">
        تقييمك يساعد ميكانيكياً آخر على اختيار المصدر المناسب بسرعة.
      </p>

      <div
        className="mt-4 flex items-center gap-1"
        onMouseLeave={() => setHovered(0)}
        role="group"
        aria-label="اختيار تقييم من 1 إلى 5 نجوم"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={pending !== null}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => void send("rating", star)}
            aria-label={`تقييم ${star} من 5`}
            aria-pressed={myRating === star}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-raised transition-colors hover:border-accent/40 disabled:opacity-50"
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                star <= displayRating
                  ? "fill-accent text-accent"
                  : "fill-transparent text-line",
              )}
              aria-hidden="true"
            />
          </button>
        ))}

        {pending === "rating" ? (
          <Loader2 className="ms-2 h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
        ) : null}
      </div>

      {summary.ratingCount > 0 ? (
        <p className="mt-3 text-[11px] text-muted">
          متوسط تقييم الزوار:{" "}
          <span className="font-bold text-muted-strong">
            {formatRating(summary.ratingAverage)} من 5
          </span>{" "}
          · {formatNumber(summary.ratingCount)} تقييم
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-muted">
          لا توجد تقييمات من الزوار بعد. كن أول من يقيّم.
        </p>
      )}

      <div className="my-5 h-px bg-line" />

      <h3 className="text-sm font-bold text-white">هل هذا المصدر مفيد؟</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void send("helpful", 1)}
          aria-pressed={myVote === 1}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-50",
            myVote === 1
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-line bg-surface-raised text-muted-strong hover:border-emerald-400/40 hover:text-emerald-300",
          )}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          مفيد
          <span className="tabular-nums text-[10px] opacity-80">
            {formatNumber(summary.helpfulYes)}
          </span>
        </button>

        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void send("helpful", -1)}
          aria-pressed={myVote === -1}
          className={cn(
            "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-50",
            myVote === -1
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-line bg-surface-raised text-muted-strong hover:border-danger/40 hover:text-danger",
          )}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          غير مفيد
          <span className="tabular-nums text-[10px] opacity-80">
            {formatNumber(summary.helpfulNo)}
          </span>
        </button>
      </div>

      <div aria-live="polite" className="mt-3 min-h-5">
        {error ? <p className="text-[11px] text-danger">{error}</p> : null}
        {message ? (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
