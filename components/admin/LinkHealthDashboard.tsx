"use client";

/**
 * File: components/admin/LinkHealthDashboard.tsx
 * Purpose: Token-gated client console for external-link health.
 *
 * Features
 * • Stats: total, live, redirect, unknown, dead, stale and hidden.
 * • Queue with status / hidden / stale filters and server-side search.
 * • Per-row: recheck, edit URL + status + notes, hide/show, delete.
 * • Batch: recheck up to 20 broken links; CSV export of the current filter.
 *
 * The ADMIN_TOKEN is kept in sessionStorage and sent as `x-admin-token`, the
 * same contract as the submissions inbox. Every API response is no-store.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { LinkStatusBadge } from "@/components/ui/LinkStatusBadge";
import { STORAGE_KEYS } from "@/components/phase4/providers/BookmarksProvider";
import { cn, formatArabicDate } from "@/lib/utils";

interface Stats {
  total: number;
  hidden: number;
  live: number;
  redirect: number;
  unknown: number;
  unverified: number;
  dead: number;
  stale7: number;
  stale30: number;
  neverChecked: number;
  checkedToday: number;
  healthPercent: number;
  lastCheckedAt: string | null;
  historyAvailable: boolean;
}

interface Row {
  id: number;
  name: string;
  url: string;
  link_status: string;
  last_verified: string | null;
  is_hidden: boolean;
  category_system: string;
  category_task: string;
  language: string;
  rating: number;
  latest: {
    status_code: number | null;
    final_url: string | null;
    error: string | null;
    checked_at: string;
    link_status: string;
  } | null;
}

interface RecentReport {
  id: number;
  source_id: number;
  source_name: string | null;
  url: string;
  status_code: number | null;
  link_status: string;
  error: string | null;
  checked_at: string;
}

interface Payload {
  stats: Stats;
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  recent: RecentReport[];
}

type StatusFilter = "all" | "problem" | "LIVE" | "REDIRECT" | "UNKNOWN" | "DEAD" | "UNVERIFIED";
type HiddenFilter = "exclude" | "only" | "all";
type SortMode = "queue" | "recent" | "name" | "status";

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "problem", label: "تحتاج مراجعة" },
  { id: "LIVE", label: "نشط" },
  { id: "REDIRECT", label: "محوّل" },
  { id: "UNKNOWN", label: "غير مؤكد" },
  { id: "DEAD", label: "معطّل" },
  { id: "UNVERIFIED", label: "غير محقّق" },
];

const EDITABLE_STATUSES = ["LIVE", "REDIRECT", "UNKNOWN", "UNVERIFIED", "DEAD"] as const;

const STATUS_FILTER_VALUE: Record<StatusFilter, string> = {
  all: "",
  problem: "DEAD,UNKNOWN,UNVERIFIED",
  LIVE: "LIVE",
  REDIRECT: "REDIRECT",
  UNKNOWN: "UNKNOWN",
  DEAD: "DEAD",
  UNVERIFIED: "UNVERIFIED",
};

function statTone(value: number, kind: "good" | "warn" | "bad" | "neutral"): string {
  if (value === 0) return "border-line bg-surface text-muted-strong";
  if (kind === "good") return "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200";
  if (kind === "warn") return "border-amber-400/30 bg-amber-400/[0.06] text-amber-200";
  if (kind === "bad") return "border-red-400/30 bg-red-400/[0.06] text-red-200";
  return "border-line bg-surface text-muted-strong";
}

export function LinkHealthDashboard({ devMode }: { devMode: boolean }) {
  const [token, setToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("problem");
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter>("exclude");
  const [sort, setSort] = useState<SortMode>("queue");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [busy, setBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editStatus, setEditStatus] = useState("LIVE");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(
    async (activeToken: string) => {
      if (!activeToken) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "25",
          sort,
          hidden: hiddenFilter,
        });
        const status = STATUS_FILTER_VALUE[statusFilter];
        if (status) params.set("status", status);
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/admin/link-health?${params.toString()}`, {
          headers: { "x-admin-token": activeToken },
          cache: "no-store",
        });
        const payload = (await response.json()) as Payload & { error?: string };

        if (response.status === 401) {
          setAuthed(false);
          setAuthError(payload.error ?? "غير مصرّح بالدخول إلى لوحة صحة الروابط.");
          try {
            sessionStorage.removeItem(STORAGE_KEYS.adminToken);
          } catch {
            /* private mode */
          }
          return;
        }
        if (!response.ok) throw new Error(payload.error ?? "تعذر تحميل البيانات.");

        setAuthed(true);
        setAuthError(null);
        setData(payload);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "تعذر تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    },
    [page, sort, hiddenFilter, statusFilter, query],
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
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => void load(token), 250);
    return () => clearTimeout(timer);
  }, [token, load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
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
      /* token still works for this page load */
    }
    setAuthError(null);
    void load(value);
  }

  async function recheck(ids?: number[]) {
    if (!token) return;
    setBusy(ids?.length ? `check:${ids[0]}` : "check:batch");
    setError(null);
    try {
      const response = await fetch("/api/admin/link-health", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(
          ids?.length
            ? { action: "recheck", ids }
            : {
                action: "recheck",
                only: ["DEAD", "UNKNOWN", "UNVERIFIED"],
                limit: 20,
              },
        ),
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: { checked: number; changed: number; byStatus: Record<string, number> };
      };
      if (!response.ok) throw new Error(payload.error ?? "تعذر إتمام الفحص.");

      const summary = payload.summary;
      setNotice(
        summary
          ? `تم فحص ${summary.checked} رابطاً، تغيّر ${summary.changed}. (${summary.byStatus.DEAD ?? 0} معطّل)`
          : "تم الفحص.",
      );
      await load(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إتمام الفحص.");
    } finally {
      setBusy(null);
    }
  }

  async function patch(id: number, body: Record<string, unknown>, message: string) {
    if (!token) return;
    setBusy(`patch:${id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/link-health/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ التغيير.");
      setNotice(message);
      setEditId(null);
      await load(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ التغيير.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: Row) {
    if (!token) return;
    const confirmed = window.confirm(
      `حذف المصدر «${row.name}» نهائياً؟\n\nسيُحذف مع سجل الفحوص والتقييمات. الأفضل استخدام «إخفاء» بدلاً من الحذف.`,
    );
    if (!confirmed) return;

    setBusy(`delete:${row.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/link-health/${row.id}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "تعذر حذف المصدر.");
      setNotice(`تم حذف «${row.name}».`);
      await load(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف المصدر.");
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv() {
    if (!token) return;
    setBusy("export");
    try {
      const params = new URLSearchParams({ format: "csv", hidden: hiddenFilter, sort });
      const status = STATUS_FILTER_VALUE[statusFilter];
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());

      const response = await fetch(`/api/admin/link-health?${params.toString()}`, {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("تعذر تصدير الملف.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `link-health-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تصدير الملف.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(row: Row) {
    setEditId(row.id);
    setEditUrl(row.url);
    setEditStatus(row.link_status);
    setEditNotes("");
  }

  const stats = data?.stats;
  const rows = data?.rows ?? [];
  const recent = data?.recent ?? [];

  const totals = useMemo(
    () => ({
      checked: stats?.checkedToday ?? 0,
    }),
    [stats],
  );

  const authCard = (
    <form onSubmit={unlock} className="surface-card mx-auto max-w-md p-6">
      <div className="flex items-center gap-2 text-white">
        <KeyRound className="h-5 w-5 text-accent-400" aria-hidden="true" />
        <h2 className="text-lg font-bold">دخول الإدارة</h2>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">
        أدخل رمز الإدارة (<code className="text-accent-300">ADMIN_TOKEN</code>) لفتح لوحة صحة الروابط.
        {devMode ? " في وضع التطوير يُقبل الرمز dev-admin." : ""}
      </p>
      <label htmlFor="admin-token" className="mt-4 block text-xs font-bold text-muted-strong">
        رمز الإدارة
      </label>
      <input
        id="admin-token"
        type="password"
        value={tokenDraft}
        onChange={(event) => setTokenDraft(event.target.value)}
        autoComplete="current-password"
        className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-3 text-sm text-white outline-none focus:border-accent"
        placeholder="••••••••"
      />
      {authError ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {authError}
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-background hover:bg-accent-400"
      >
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        فتح اللوحة
      </button>
    </form>
  );

  if (!authed && !token) {
    return authCard;
  }

  return (
    <div className="space-y-6">
      {!authed && token ? authCard : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
        </div>
      ) : null}

      {authed ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="الإجمالي" value={stats?.total ?? 0} icon={Link2} />
            <Stat label="نشط" value={stats?.live ?? 0} icon={Check} tone="good" />
            <Stat label="محوّل" value={stats?.redirect ?? 0} icon={Activity} tone="warn" />
            <Stat label="غير مؤكد" value={stats?.unknown ?? 0} icon={Clock3} tone="warn" />
            <Stat label="معطّل" value={stats?.dead ?? 0} icon={X} tone="bad" />
            <Stat label="قديم +7 أيام" value={stats?.stale7 ?? 0} icon={Clock3} tone="warn" />
            <Stat label="مخفي" value={stats?.hidden ?? 0} icon={EyeOff} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>
              الصحة: <strong className="text-white">{stats?.healthPercent ?? 0}%</strong> (نشط + محوّل)
            </span>
            <span>
              فُحص اليوم: <strong className="text-white">{totals.checked}</strong>
            </span>
            <span>
              لم يُفحص قط: <strong className="text-white">{stats?.neverChecked ?? 0}</strong>
            </span>
            <span>
              آخر فحص:{" "}
              <strong className="text-white">
                {stats?.lastCheckedAt
                  ? new Date(stats.lastCheckedAt).toLocaleString("ar-TN-u-nu-latn")
                  : "—"}
              </strong>
            </span>
            {stats && !stats.historyAvailable ? (
              <span className="text-amber-300">سجل link_reports غير متاح — طبّق ترحيل Task 3.</span>
            ) : null}
          </div>

          {/* Toolbar */}
          <div className="surface-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => {
                    setPage(1);
                    setQuery(event.target.value);
                  }}
                  placeholder="ابحث بالاسم أو الرابط أو النظام…"
                  aria-label="بحث"
                  className="w-full rounded-xl border border-line bg-background py-2.5 pe-3 ps-9 text-xs text-white outline-none focus:border-accent"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value as StatusFilter);
                }}
                aria-label="تصفية بالحالة"
                className="rounded-xl border border-line bg-background px-3 py-2.5 text-xs text-white outline-none focus:border-accent"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={hiddenFilter}
                onChange={(event) => {
                  setPage(1);
                  setHiddenFilter(event.target.value as HiddenFilter);
                }}
                aria-label="تصفية بالإخفاء"
                className="rounded-xl border border-line bg-background px-3 py-2.5 text-xs text-white outline-none focus:border-accent"
              >
                <option value="exclude">بدون المخفي</option>
                <option value="only">المخفي فقط</option>
                <option value="all">الكل</option>
              </select>

              <select
                value={sort}
                onChange={(event) => {
                  setPage(1);
                  setSort(event.target.value as SortMode);
                }}
                aria-label="ترتيب"
                className="rounded-xl border border-line bg-background px-3 py-2.5 text-xs text-white outline-none focus:border-accent"
              >
                <option value="queue">الأقدم فحصاً أولاً</option>
                <option value="recent">الأحدث فحصاً</option>
                <option value="name">الاسم</option>
                <option value="status">الحالة</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void recheck()}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 text-[11px] font-bold text-accent-200 hover:bg-accent hover:text-background disabled:opacity-50"
              >
                {busy === "check:batch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                فحص 20 رابطاً معطّلاً
              </button>
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong hover:text-white disabled:opacity-50"
              >
                {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                CSV
              </button>
              <button
                type="button"
                onClick={() => void load(token)}
                disabled={loading}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                تحديث
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="surface-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-start text-xs">
                <thead className="border-b border-line bg-surface-raised/60 text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-bold">المصدر</th>
                    <th className="px-4 py-3 text-start font-bold">الرابط</th>
                    <th className="px-4 py-3 text-start font-bold">الحالة</th>
                    <th className="px-4 py-3 text-start font-bold">آخر فحص</th>
                    <th className="px-4 py-3 text-start font-bold">الاستجابة</th>
                    <th className="px-4 py-3 text-end font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => {
                    const isEditing = editId === row.id;
                    return (
                      <tr key={row.id} className={cn("align-top", row.is_hidden && "opacity-60")}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{row.name}</div>
                          <div className="mt-1 text-[10px] text-muted">
                            #{row.id} · {row.category_system} · {row.category_task}
                          </div>
                          {row.is_hidden ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-400/10 px-2 py-0.5 text-[9px] text-slate-300">
                              <EyeOff className="h-2.5 w-2.5" /> مخفي عن الجمهور
                            </span>
                          ) : null}
                        </td>
                        <td className="max-w-[320px] px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                value={editUrl}
                                onChange={(event) => setEditUrl(event.target.value)}
                                dir="ltr"
                                className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-[11px] text-white outline-none focus:border-accent"
                              />
                              <select
                                value={editStatus}
                                onChange={(event) => setEditStatus(event.target.value)}
                                className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-[11px] text-white"
                              >
                                {EDITABLE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={editNotes}
                                onChange={(event) => setEditNotes(event.target.value)}
                                placeholder="ملاحظة إدارية (اختياري)"
                                className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-[11px] text-white"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void patch(
                                      row.id,
                                      {
                                        url: editUrl,
                                        link_status: editStatus,
                                        ...(editNotes.trim() ? { notes: editNotes.trim() } : {}),
                                      },
                                      `تم تحديث «${row.name}».`,
                                    )
                                  }
                                  disabled={busy !== null}
                                  className="rounded-lg bg-accent px-2.5 py-1 text-[10px] font-bold text-background disabled:opacity-50"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditId(null)}
                                  className="rounded-lg border border-line px-2.5 py-1 text-[10px] font-bold text-muted-strong"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              dir="ltr"
                              className="block truncate font-mono text-[11px] text-accent-300 hover:underline"
                              title={row.url}
                            >
                              {row.url}
                            </a>
                          )}
                          {row.latest?.final_url && row.latest.final_url !== row.url ? (
                            <div className="mt-1 truncate text-[9px] text-amber-300/80" dir="ltr" title={row.latest.final_url}>
                              → {row.latest.final_url}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <LinkStatusBadge status={row.link_status} lastVerified={row.last_verified} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-muted-strong">
                          {row.last_verified ? formatArabicDate(row.last_verified) : "لم يُفحص"}
                          {row.latest ? (
                            <div className="mt-1 text-[9px] text-muted">
                              {new Date(row.latest.checked_at).toLocaleString("ar-TN-u-nu-latn")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          {row.latest ? (
                            <>
                              <div className={cn("font-mono", row.latest.status_code && row.latest.status_code < 400 ? "text-emerald-300" : "text-amber-300")}>
                                HTTP {row.latest.status_code ?? "—"}
                              </div>
                              {row.latest.error ? (
                                <div className="mt-1 max-w-[180px] truncate text-[9px] text-red-300" title={row.latest.error}>
                                  {row.latest.error}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void recheck([row.id])}
                              disabled={busy !== null}
                              title="إعادة فحص"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white disabled:opacity-50"
                            >
                              {busy === `check:${row.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => (isEditing ? setEditId(null) : startEdit(row))}
                              title="تعديل"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void patch(
                                  row.id,
                                  { is_hidden: !row.is_hidden },
                                  row.is_hidden ? `أصبح «${row.name}» ظاهراً.` : `تم إخفاء «${row.name}» عن الجمهور.`,
                                )
                              }
                              disabled={busy !== null}
                              title={row.is_hidden ? "إظهار" : "إخفاء"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted-strong hover:border-accent/40 hover:text-white disabled:opacity-50"
                            >
                              {row.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              disabled={busy !== null}
                              title="حذف نهائي"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/25 bg-red-400/[0.06] text-red-300 hover:bg-red-400/15 disabled:opacity-50"
                            >
                              {busy === `delete:${row.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted">
                        {loading ? "جارٍ التحميل…" : "لا توجد روابط مطابقة للفلاتر الحالية."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[11px] text-muted">
              <span>
                {data ? `${data.total} نتيجة · صفحة ${data.page} من ${data.totalPages}` : "—"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!data || data.page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-lg border border-line px-3 py-1.5 font-bold text-muted-strong disabled:opacity-40"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={!data || data.page >= data.totalPages || loading}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-line px-3 py-1.5 font-bold text-muted-strong disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>

          {/* Recent checks */}
          {recent.length > 0 ? (
            <div className="surface-card p-4">
              <h2 className="text-sm font-bold text-white">آخر عمليات الفحص</h2>
              <ul className="mt-3 divide-y divide-line text-[11px]">
                {recent.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <LinkStatusBadge status={report.link_status} showLabel={false} />
                      <span className="truncate text-muted-strong">{report.source_name ?? `#${report.source_id}`}</span>
                      <span className="truncate font-mono text-[10px] text-muted" dir="ltr">
                        {report.url}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted">
                      HTTP {report.status_code ?? "—"} ·{" "}
                      {new Date(report.checked_at).toLocaleString("ar-TN-u-nu-latn")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: typeof Link2;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <div className={cn("rounded-xl border p-3", statTone(value, tone))}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-muted">{label}</span>
        <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
}
