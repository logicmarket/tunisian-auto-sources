"use client";

/**
 * File: components/phase4/RatingWidget.tsx
 * Purpose: Hardened 5-star + thumbs + comment widget used on source detail
 * pages and inside diagnosis results.
 *
 * - optimistic star feedback, then server reconciliation
 * - average hidden until 3 ratings exist
 * - one rating per browser; edits update the same row
 * - comment locked until the visitor has rated 3 sources
 * - Arabic-only errors with a retry action
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  RotateCw,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";
import { cn, formatNumber, formatRating } from "@/lib/utils";

interface RatingWidgetProps {
  sourceId: number;
  sourceName?: string;
  initialAverage?: number;
  initialTotal?: number;
  variant?: "full" | "compact";
  className?: string;
}

interface RatingResponse {
  average: number;
  total: number;
  visitorRating: number | null;
  visitorComment: string | null;
  visitorHelpful: boolean | null;
  showAverage: boolean;
  flagged?: boolean;
  commentAllowed?: boolean;
  updatedAt?: string | null;
}

interface RateResponse extends RatingResponse {
  success: boolean;
  message: string;
  currentRating: number;
  totalRatings: number;
  commentAccepted: boolean;
  commentNotice: string | null;
  error?: string;
}

type Pending = "stars" | "helpful" | "comment" | null;

const MAX_COMMENT = 140;

export function RatingWidget({
  sourceId,
  sourceName,
  initialAverage = 0,
  initialTotal = 0,
  variant = "full",
  className,
}: RatingWidgetProps) {
  const { ready, visitorId, saveRating, notify } = useBookmarks();

  const [average, setAverage] = useState(initialAverage);
  const [total, setTotal] = useState(initialTotal);
  const [myStars, setMyStars] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [commentAllowed, setCommentAllowed] = useState(false);
  const [myHelpful, setMyHelpful] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(0);
  const [justClicked, setJustClicked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<null | (() => void)>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAverage = total >= 3;

  const applyResponse = useCallback(
    (payload: RatingResponse, stars: number) => {
      setAverage(payload.average);
      setTotal(payload.total);
      setMyStars(payload.visitorRating ?? stars);
      setMyHelpful(payload.visitorHelpful ?? null);
      if (payload.visitorComment !== null) setMyComment(payload.visitorComment);
      if (typeof payload.commentAllowed === "boolean") {
        setCommentAllowed(payload.commentAllowed);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    if (!ready || !visitorId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(
        `/api/sources/${sourceId}/rating?visitorId=${encodeURIComponent(visitorId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as RatingResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر تحميل التقييمات.");
      }
      applyResponse(payload, payload.visitorRating ?? 0);
      if (payload.visitorRating) {
        saveRating(sourceId, payload.visitorRating, {
          comment: payload.visitorComment,
          helpful: payload.visitorHelpful,
        });
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applyResponse, ready, saveRating, sourceId, visitorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  const submit = useCallback(
    async (
      stars: number,
      options: { comment?: string | null; helpful?: boolean | null } = {},
    ) => {
      if (!ready) {
        setError("جارٍ تجهيز التخزين المحلي. حاول بعد لحظة.");
        return;
      }
      if (!visitorId) {
        setError(
          "المتصفح في وضع التصفح الخاص. بعض الميزات غير متاحة. استخدم متصفح عادي.",
        );
        return;
      }

      const previousStars = myStars;
      const previousHelpful = myHelpful;
      const kind: Pending =
        options.helpful !== undefined
          ? "helpful"
          : options.comment
            ? "comment"
            : "stars";

      setPending(kind);
      setError(null);
      setMessage(null);
      setFieldError(null);
      setRetryAction(null);

      // Optimistic feedback.
      if (options.helpful === undefined) setMyStars(stars);
      if (typeof options.comment === "string" && options.comment.trim()) {
        setMyComment(options.comment.trim());
      }

      try {
        const response = await fetch(`/api/sources/${sourceId}/rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            stars,
            visitorId,
            comment:
              typeof options.comment === "string"
                ? options.comment
                : undefined,
            helpful:
              typeof options.helpful === "boolean"
                ? options.helpful
                : undefined,
          }),
        });
        const payload = (await response.json()) as RateResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "تعذر تسجيل التقييم. جرّب مرة أخرى.");
        }

        applyResponse(payload, stars);
        setMessage(payload.message);
        if (payload.commentNotice) notify(payload.commentNotice);
        if (payload.commentAccepted) setCommentAllowed(true);

        saveRating(sourceId, payload.visitorRating ?? stars, {
          comment: payload.visitorComment,
          helpful:
            payload.visitorHelpful ??
            (typeof options.helpful === "boolean" ? options.helpful : null),
        });
      } catch (cause) {
        setMyStars(previousStars);
        setMyHelpful(previousHelpful);
        setError(
          cause instanceof Error
            ? cause.message
            : "تعذر تسجيل التقييم. جرّب مرة أخرى.",
        );
        setRetryAction(() => () => {
          void submit(stars, options);
        });
      } finally {
        setPending(null);
      }
    },
    [
      applyResponse,
      myHelpful,
      myStars,
      notify,
      ready,
      saveRating,
      sourceId,
      visitorId,
    ],
  );

  function handleStar(star: number) {
    if (pending) return;
    setJustClicked(star);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setJustClicked(0), 260);
    void submit(star);
  }

  function handleHelpful(value: boolean) {
    if (pending) return;
    if (myStars < 1) {
      setMessage(null);
      setError("اختر تقييماً بالنجوم أولاً، ثم صوّت على فائدة المصدر.");
      return;
    }
    void submit(myStars, { helpful: value });
  }

  function handleComment() {
    if (pending) return;
    const trimmed = myComment.trim();
    if (myStars < 1) {
      setError("اختر تقييماً بالنجوم أولاً قبل إرسال التعليق.");
      return;
    }
    if (trimmed.length < 3) {
      setFieldError("اكتب تعليقاً قصيراً (3 أحرف على الأقل).");
      return;
    }
    if (trimmed.length > MAX_COMMENT) {
      setFieldError(`التعليق يجب ألا يتجاوز ${MAX_COMMENT} حرفاً.`);
      return;
    }
    void submit(myStars, { comment: trimmed });
  }

  const displayStars = hovered || myStars;
  const roundedAverage = Math.round(average);
  const starsDisabled = pending !== null || !ready;

  const helper = useMemo(() => {
    if (total === 0) return "لم يُقيَّم بعد — كن أول من يُقيّم";
    if (!showAverage) {
      return `سيظهر المتوسط بعد 3 تقييمات (${formatNumber(total)} حتى الآن)`;
    }
    return `${formatNumber(total)} تقييم`;
  }, [showAverage, total]);

  return (
    <section
      id="rate"
      aria-labelledby={`rating-title-${sourceId}`}
      className={cn(
        "surface-card scroll-mt-24",
        variant === "full" ? "p-5 sm:p-6" : "p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id={`rating-title-${sourceId}`}
            className={cn(
              "font-extrabold text-white",
              variant === "full" ? "text-base" : "text-sm",
            )}
          >
            قيّم هذا المصدر
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            تقييمك يساعد ميكانيكياً آخر على اختيار المصدر المناسب بسرعة.
          </p>
        </div>

        {showAverage ? (
          <div
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised/70 px-3 py-2"
            aria-label={`متوسط التقييم ${formatRating(average)} من 5 بناءً على ${total} تقييم`}
          >
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3.5 w-3.5",
                    star <= roundedAverage
                      ? "fill-accent text-accent"
                      : "fill-transparent text-line",
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-extrabold tabular-nums text-white">
              {formatRating(average)}
            </span>
            <span className="text-[10px] text-muted">
              ({formatNumber(total)})
            </span>
          </div>
        ) : null}
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-1.5"
        onMouseLeave={() => setHovered(0)}
        role="group"
        aria-label="اختيار تقييم من 1 إلى 5 نجوم"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={starsDisabled}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(0)}
            onClick={() => handleStar(star)}
            aria-label={`تقييم ${star} من 5${myStars === star ? " — تقييمك الحالي" : ""}`}
            aria-pressed={myStars === star}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200 disabled:opacity-50",
              myStars === star
                ? "border-accent/50 bg-accent/15"
                : "border-line bg-surface-raised hover:border-accent/40",
              justClicked === star && "scale-110 border-accent bg-accent/20",
            )}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-all duration-200",
                star <= displayStars
                  ? "fill-accent text-accent"
                  : "fill-transparent text-line",
                justClicked === star && "scale-125",
              )}
              aria-hidden="true"
            />
          </button>
        ))}

        {pending === "stars" ? (
          <Loader2
            className="ms-1 h-4 w-4 animate-spin text-accent-400"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="mt-3 min-h-5">
        {loading ? (
          <div className="h-4 w-48 animate-pulse rounded bg-line/60" />
        ) : (
          <p className="text-[11px] leading-5 text-muted">
            {myStars > 0 ? (
              <span className="font-bold text-muted-strong">
                تقييمك: {myStars} من 5 ·{" "}
              </span>
            ) : null}
            {helper}
          </p>
        )}
        {myStars === 0 && total === 0 && !loading ? (
          <p className="text-[11px] text-accent-200">
            اضغط النجوم لتقييم هذا المصدر
          </p>
        ) : null}
      </div>

      {variant === "full" ? (
        <>
          <div className="my-5 h-px bg-line" />

          <h3 className="text-sm font-bold text-white">هل هذا المصدر مفيد؟</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending !== null || !ready}
              onClick={() => handleHelpful(true)}
              aria-pressed={myHelpful === true}
              aria-label="المصدر مفيد"
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-50",
                myHelpful === true
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-line bg-surface-raised text-muted-strong hover:border-emerald-400/40 hover:text-emerald-300",
              )}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
              مفيد
            </button>
            <button
              type="button"
              disabled={pending !== null || !ready}
              onClick={() => handleHelpful(false)}
              aria-pressed={myHelpful === false}
              aria-label="المصدر غير مفيد"
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-50",
                myHelpful === false
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-line bg-surface-raised text-muted-strong hover:border-danger/40 hover:text-danger",
              )}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
              غير مفيد
            </button>
          </div>

          <div className="mt-5">
            <label
              htmlFor={`rating-comment-${sourceId}`}
              className="flex items-center gap-1.5 text-sm font-bold text-white"
            >
              <MessageSquare className="h-4 w-4 text-accent-400" aria-hidden="true" />
              تعليق اختياري
            </label>

            {commentAllowed ? (
              <>
                <textarea
                  id={`rating-comment-${sourceId}`}
                  value={myComment}
                  onChange={(event) => {
                    if (event.target.value.length <= MAX_COMMENT) {
                      setMyComment(event.target.value);
                      setFieldError(null);
                    }
                  }}
                  maxLength={MAX_COMMENT}
                  rows={3}
                  dir="rtl"
                  placeholder="ما الذي ساعدك أو لم يساعدك في هذا المصدر؟"
                  aria-describedby={`rating-comment-help-${sourceId}`}
                  className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-raised p-3 text-sm leading-7 text-white placeholder:text-muted/70 focus:border-accent/50"
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p
                    id={`rating-comment-help-${sourceId}`}
                    className="text-[10px] text-muted"
                  >
                    {myComment.trim().length}/{MAX_COMMENT} حرفاً
                  </p>
                  <button
                    type="button"
                    onClick={handleComment}
                    disabled={pending !== null || !myComment.trim()}
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 text-[11px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background disabled:opacity-50"
                  >
                    {pending === "comment" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    إرسال التعليق
                  </button>
                </div>
                {fieldError ? (
                  <p className="mt-1 text-[11px] text-danger">{fieldError}</p>
                ) : null}
              </>
            ) : (
              <div className="mt-2 rounded-xl border border-line bg-surface-raised/60 p-3">
                <p className="text-[11px] leading-6 text-muted">
                  التعليقات تُفتح بعد تقييم 3 مصادر مختلفة. هذا الإجراء يحمي
                  التقييمات من الرسائل المزعجة.
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-[10px] leading-5 text-muted/80">
            تقييم واحد لكل متصفح · يمكنك تعديل تقييمك في أي وقت. تُراجَع
            الأنماط المتطرفة (كل 5 نجوم أو كل نجمة واحدة) يدوياً.
          </p>
        </>
      ) : null}

      <div aria-live="polite" className="mt-3 min-h-5 space-y-1.5">
        {loadError ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-danger">
            <span>تعذر تحميل التقييمات. جرّب مرة أخرى.</span>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-danger/30 px-2 font-bold text-danger"
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-danger">
            <span>{error}</span>
            {retryAction ? (
              <button
                type="button"
                onClick={() => {
                  const action = retryAction;
                  setRetryAction(null);
                  action();
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-danger/30 px-2 font-bold text-danger"
              >
                <RotateCw className="h-3 w-3" aria-hidden="true" />
                إعادة
              </button>
            ) : null}
          </div>
        ) : null}

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
