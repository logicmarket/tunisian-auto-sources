"use client";

/**
 * File: components/phase4/admin/SubmissionReview.tsx
 * Purpose: Account-free admin inbox for the submission workflow. The token is
 * kept in sessionStorage and sent as `x-admin-token`; every action has an
 * Arabic success/error message.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { STORAGE_KEYS } from "@/components/phase4/providers/BookmarksProvider";
import type { SubmissionRecord } from "@/lib/types";
import { formatArabicDate, cn } from "@/lib/utils";

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "pending", label: "قيد المراجعة" },
  { id: "approved", label: "معتمدة" },
  { id: "rejected", label: "مرفوضة" },
  { id: "all", label: "الكل" },
];

const STATUS_LABEL: Record<SubmissionRecord["status"], string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const STATUS_TONE: Record<SubmissionRecord["status"], string> = {
  pending: "border-amber-400/30 bg-amber-400/[0.08] text-amber-200",
  approved: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300",
  rejected: "border-danger/30 bg-danger/[0.08] text-danger",
};

export function SubmissionReview({ devMode }: { devMode: boolean }) {
  const [token, setToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteById, setNoteById] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (activeToken: string, status: StatusFilter) => {
      if (!activeToken) return;
      setLoading(true);
      setError(null);
      try {
      const response = await fetch(`/api/admin/submissions?status=${status}`, {
          headers: { "x-admin-token": activeToken },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          counts?: Counts;
          submissions?: SubmissionRecord[];
          error?: string;
        };

        if (response.status === 401) {
          setAuthed(false);
          setAuthError(payload.error ?? "غير مصرّح بالدخول إلى لوحة المراجعة.");
          sessionStorage.removeItem(STORAGE_KEYS.adminToken);
          return;
        }
        if (!response.ok) {
          throw new Error(payload.error ?? "تعذر تحميل الاقتراحات. جرّب مرة أخرى.");
        }

        setAuthed(true);
        setAuthError(null);
        setCounts(payload.counts ?? null);
        setSubmissions(payload.submissions ?? []);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "تعذر تحميل الاقتراحات. جرّب مرة أخرى.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let stored = "";
    try {
      stored = sessionStorage.getItem(STORAGE_KEYS.adminToken) ?? "";
    } catch {
      stored = "";
    }
    if (stored) {
      setToken(stored);
      setTokenDraft(stored);
      void load(stored, "pending");
    }
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = tokenDraft.trim();
    if (!value) {
      setAuthError("أدخل رمز الإدارة أولاً.");
      return;
    }
    setToken(value);
    try {
      sessionStorage.setItem(STORAGE_KEYS.adminToken, value);
    } catch {
      // Token still works for this page load.
    }
    setAuthError(null);
    void load(value, filter);
  }

  function switchFilter(next: StatusFilter) {
    setFilter(next);
    void load(token, next);
  }

  async function review(
    id: number,
    action: "approve" | "reject",
    note: string,
  ) {
    if (busyId !== null) return;
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        if (response.status === 401) {
          setAuthed(false);
          setAuthError(payload.error ?? "انتهت صلاحية الجلسة. أدخل الرمز مجدداً.");
          return;
        }
        throw new Error(payload.error ?? "تعذر تنفيذ المراجعة. جرّب مرة أخرى.");
      }

      setNotice(payload.message ?? "تم تحديث الاقتراح.");
      setSubmissions((previous) => previous.filter((item) => item.id !== id));
      setCounts((previous) => {
        if (!previous) return previous;
        const next = { ...previous };
        if (action === "approve") {
          next.pending = Math.max(0, next.pending - 1);
          next.approved += 1;
        } else {
          next.pending = Math.max(0, next.pending - 1);
          next.rejected += 1;
        }
        return next;
      });
      setNoteById((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      if (filter !== "all" && filter !== "pending") {
        void load(token, filter);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر تنفيذ المراجعة. جرّب مرة أخرى.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const visibleCount = useMemo(() => submissions.length, [submissions]);

  if (!authed) {
    return (
      <div className="mx-auto max-w-md">
        <form onSubmit={unlock} className="surface-card p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-white">لوحة المراجعة</h2>
          <p className="mt-1.5 text-[11px] leading-6 text-muted">
            أدخل رمز الإدارة للوصول إلى الاقتراحات. يُحفظ في جلسة هذا التبويب
            فقط ولا يُرسل إلى أي جهة أخرى.
          </p>

          <label htmlFor="admin-token" className="mt-4 block text-[11px] font-bold text-white">
            رمز الإدارة
          </label>
          <input
            id="admin-token"
            type="password"
            dir="ltr"
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(authError)}
            aria-describedby="admin-token-help"
            className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 font-mono text-sm text-white focus:border-accent/50"
          />
          <p id="admin-token-help" className="mt-1 min-h-5 text-[10px] leading-5">
            {authError ? (
              <span className="text-danger">{authError}</span>
            ) : devMode ? (
              <span className="text-amber-300">
                وضع التطوير: الرمز الافتراضي هو dev-admin. عيّن ADMIN_TOKEN قبل
                النشر.
              </span>
            ) : (
              <span className="text-muted">يُعرَّف في متغير البيئة ADMIN_TOKEN.</span>
            )}
          </p>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            فتح اللوحة
          </button>
        </form>

        <p className="mt-3 text-center text-[10px] leading-5 text-muted">
          لا توجد حسابات مستخدمين. الوصول محصور برمز إداري واحد قابل للتدوير.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="تصفية الاقتراحات">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => switchFilter(item.id)}
              className={cn(
                "inline-flex min-h-12 items-center gap-1 rounded-lg border px-3 text-[11px] font-bold transition-colors",
                filter === item.id
                  ? "border-accent/50 bg-accent/10 text-accent-200"
                  : "border-line bg-surface text-muted-strong hover:text-white",
              )}
            >
              {item.label}
              {counts ? (
                <span className="rounded bg-surface-raised px-1 text-[9px] tabular-nums text-muted">
                  {counts[item.id === "all" ? "total" : item.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load(token, filter)}
            disabled={loading}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" />
            تحديث
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(STORAGE_KEYS.adminToken);
              } catch {
                // ignore
              }
              setAuthed(false);
              setToken("");
              setTokenDraft("");
              setSubmissions([]);
              setCounts(null);
            }}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong hover:border-danger/40 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            خروج
          </button>
        </div>
      </div>

      {notice ? (
        <p className="flex items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3 text-[11px] text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-[11px] text-danger"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void load(token, filter)}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-danger/30 px-2.5 font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {loading && submissions.length === 0 ? (
        <div className="surface-card flex items-center gap-2 p-4 text-[11px] text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
          جارٍ تحميل الاقتراحات…
        </div>
      ) : null}

      {!loading && visibleCount === 0 ? (
        <div className="surface-card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-bold text-white">
            لا توجد اقتراحات في هذا التصنيف.
          </p>
          <p className="mt-1 text-[11px] text-muted">
            ستظهر الاقتراحات الجديدة هنا فور إرسالها من الزوار.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {submissions.map((submission) => {
          const flags = submission.spam_flags
            ? (JSON.parse(submission.spam_flags) as string[])
            : [];
          const note = noteById[submission.id] ?? "";

          return (
            <li key={submission.id} className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">{submission.name}</h3>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-extrabold",
                        STATUS_TONE[submission.status],
                      )}
                    >
                      {STATUS_LABEL[submission.status]}
                    </span>
                    <span className="font-mono text-[9px] text-muted" dir="ltr">
                      #{submission.id}
                    </span>
                  </div>
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="mt-1 inline-flex max-w-full items-center gap-1 text-[10px] text-accent-300 hover:underline"
                  >
                    <span className="truncate">{submission.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
                <p className="text-[10px] text-muted">
                  {formatArabicDate(submission.created_at)}
                </p>
              </div>

              <p className="mt-2 text-[11px] leading-6 text-muted-strong">
                {submission.description_ar}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">{submission.suggested_system}</span>
                <span className="chip">{submission.suggested_task}</span>
                {submission.email ? (
                  <span className="chip" dir="ltr">
                    {submission.email}
                  </span>
                ) : null}
                {submission.recaptcha_score !== null ? (
                  <span className="chip">reCAPTCHA: {submission.recaptcha_score}</span>
                ) : null}
              </div>

              {submission.reason ? (
                <p className="mt-2 rounded-lg border border-line bg-surface-raised/50 p-2.5 text-[10px] leading-6 text-muted">
                  <span className="font-bold text-muted-strong">سبب الاقتراح: </span>
                  {submission.reason}
                </p>
              ) : null}

              {flags.length > 0 ? (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-2.5 text-[10px] leading-6 text-amber-100">
                  <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  أعلام آلية: {flags.join(", ")}
                </p>
              ) : null}

              {submission.status === "pending" ? (
                <div className="mt-3 border-t border-line pt-3">
                  <label
                    htmlFor={`note-${submission.id}`}
                    className="text-[10px] font-bold text-muted"
                  >
                    ملاحظة المراجع (اختياري، تُبلَّغ لصاحب الاقتراح)
                  </label>
                  <textarea
                    id={`note-${submission.id}`}
                    value={note}
                    onChange={(event) =>
                      setNoteById((previous) => ({
                        ...previous,
                        [submission.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    maxLength={400}
                    placeholder="مثال: المصدر مفيد لكن الوصف يحتاج تفاصيل أكثر."
                    className="mt-1.5 w-full resize-y rounded-lg border border-line bg-surface-raised p-2.5 text-[11px] leading-6 text-white placeholder:text-muted/60 focus:border-accent/50"
                  />

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === submission.id}
                      onClick={() => void review(submission.id, "approve", note)}
                      className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-3 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-400 hover:text-background disabled:opacity-50"
                    >
                      {busyId === submission.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      اعتماد ونشر
                    </button>
                    <button
                      type="button"
                      disabled={busyId === submission.id}
                      onClick={() => void review(submission.id, "reject", note)}
                      className="inline-flex min-h-12 items-center gap-1.5 rounded-lg border border-danger/35 bg-danger/10 px-3 text-[11px] font-bold text-danger transition-colors hover:bg-danger hover:text-background disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      رفض
                    </button>
                    <Link
                      href={`/contribute/status/${submission.id}`}
                      target="_blank"
                      className="inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-muted underline underline-offset-4 hover:text-white"
                    >
                      صفحة الحالة
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <p className="text-[10px] text-muted">
                    روجع في {formatArabicDate(submission.reviewed_at)}
                    {submission.reviewer_note ? ` · ${submission.reviewer_note}` : ""}
                  </p>
                  {submission.published_source_id ? (
                    <Link
                      href={`/sources/${submission.published_source_id}`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 text-[10px] font-bold text-muted-strong hover:text-white"
                    >
                      المصدر المنشور
                    </Link>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
