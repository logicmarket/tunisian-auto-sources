/**
 * File: lib/link-health.ts
 * Purpose: Shared engine for external-link health checks. Used by
 * `scripts/check-links.ts`, the admin API routes and the Vercel cron route so
 * there is exactly one classification policy and one persistence path.
 *
 * Safety model
 * • `checkLink()` never throws for network failures: it returns UNKNOWN with
 *   the error message, so a transient outage can never silently mark a source
 *   DEAD.
 * • `persistOutcomes()` is only called when the caller explicitly opts in.
 *   The CLI is dry-run by default (`--write` required).
 * • History rows are written only if the `link_reports` table exists. The
 *   checker degrades to updating `sources` alone on an older schema.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

export const LINK_STATUS_VALUES = [
  "LIVE",
  "REDIRECT",
  "UNKNOWN",
  "UNVERIFIED",
  "DEAD",
] as const;

export type LinkStatusValue = (typeof LINK_STATUS_VALUES)[number];

export const DEFAULT_TIMEOUT_MS = 12_000;
export const DEFAULT_CONCURRENCY = 8;
export const DEFAULT_USER_AGENT =
  "TunisianAutoSources-LinkHealth/1.0 (+https://github.com/logicmarket/tunisian-auto-sources)";

/** Statuses considered "not healthy" for the admin queue. */
export const PROBLEM_STATUSES: readonly LinkStatusValue[] = ["DEAD", "UNKNOWN", "UNVERIFIED"];

export interface LinkTarget {
  id: number;
  name: string;
  url: string;
  link_status: string;
  last_verified: string | null;
  is_hidden?: boolean;
}

export interface LinkCheckOutcome {
  sourceId: number;
  name: string;
  url: string;
  previousStatus: string;
  linkStatus: LinkStatusValue;
  httpStatus: number | null;
  finalUrl: string | null;
  error: string | null;
  durationMs: number;
  checkedAt: string;
  changed: boolean;
}

export interface CheckOptions {
  timeoutMs?: number;
  concurrency?: number;
  userAgent?: string;
  /** Called after each settled target (1-based completed count). */
  onProgress?: (completed: number, total: number, outcome: LinkCheckOutcome) => void;
}

export interface CheckSelection {
  ids?: number[];
  /** Only re-check sources whose current status is in this list. */
  only?: string[];
  /** Only re-check links last verified before this ISO date (YYYY-MM-DD). */
  staleBefore?: string | null;
  /** Include hidden sources. Defaults to false. */
  includeHidden?: boolean;
  limit?: number;
}

export interface CheckSummary {
  total: number;
  checked: number;
  changed: number;
  byStatus: Record<LinkStatusValue, number>;
  dead: LinkCheckOutcome[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  persisted: boolean;
  historyWritten: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * URL helpers
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Normalises a URL for redirect comparison. Ignores protocol, `www.`, default
 * ports, a trailing slash and the fragment — but keeps the path and query
 * because a move to another path is a real REDIRECT.
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const port =
      url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))
        ? `:${url.port}`
        : "";
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${port}${path}${url.search}`.toLowerCase();
  } catch {
    return raw.trim().replace(/\/+$/, "").toLowerCase();
  }
}

/** Returns a clean absolute http(s) URL or null. */
export function parseExternalUrl(raw: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isoDateDaysAgo(days: number, now = new Date()): string {
  const copy = new Date(now.getTime());
  copy.setUTCDate(copy.getUTCDate() - Math.max(0, Math.trunc(days)));
  return todayIsoDate(copy);
}

export function isProblemStatus(status: string): boolean {
  return (PROBLEM_STATUSES as readonly string[]).includes(status);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Single-link check
 * ──────────────────────────────────────────────────────────────────────────── */

interface FetchAttempt {
  status: number;
  finalUrl: string;
}

async function requestOnce(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
  userAgent: string,
): Promise<FetchAttempt> {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    cache: "no-store",
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ar,fr;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Never download the body: we only need the status line and final URL.
  try {
    await response.body?.cancel();
  } catch {
    /* body already closed or not present (HEAD) */
  }

  return { status: response.status, finalUrl: response.url || url };
}

/** Statuses that many servers answer correctly only for GET. */
const GET_FALLBACK_STATUSES = new Set([400, 403, 404, 405, 406, 409, 410, 429, 500, 501, 502, 503, 504, 520, 522, 524]);

export function classifyHttpResult(
  requestedUrl: string,
  attempt: FetchAttempt,
): LinkStatusValue {
  const { status, finalUrl } = attempt;

  if (status >= 200 && status < 300) {
    return normalizeUrl(finalUrl) === normalizeUrl(requestedUrl) ? "LIVE" : "REDIRECT";
  }
  if (status === 404 || status === 410) return "DEAD";
  // 401/403/429/5xx: the host answered, but the link's health is unknown.
  return "UNKNOWN";
}

/**
 * Checks one URL. HEAD first, GET only when HEAD is inconclusive. Returns a
 * typed result rather than throwing so a batch always completes.
 */
export async function checkLink(
  url: string,
  options: Pick<CheckOptions, "timeoutMs" | "userAgent"> = {},
): Promise<{
  linkStatus: LinkStatusValue;
  httpStatus: number | null;
  finalUrl: string | null;
  error: string | null;
  durationMs: number;
}> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const started = Date.now();

  const finish = (
    linkStatus: LinkStatusValue,
    attempt: FetchAttempt | null,
    error: string | null,
  ) => ({
    linkStatus,
    httpStatus: attempt?.status ?? null,
    finalUrl: attempt?.finalUrl ?? null,
    error,
    durationMs: Date.now() - started,
  });

  let head: FetchAttempt | null = null;
  let headError: string | null = null;

  try {
    head = await requestOnce(url, "HEAD", timeoutMs, userAgent);
    if (!GET_FALLBACK_STATUSES.has(head.status)) {
      return finish(classifyHttpResult(url, head), head, null);
    }
  } catch (error) {
    headError = error instanceof Error ? error.message : String(error);
  }

  try {
    const get = await requestOnce(url, "GET", timeoutMs, userAgent);
    return finish(classifyHttpResult(url, get), get, null);
  } catch (error) {
    const getError = error instanceof Error ? error.message : String(error);
    // If HEAD already produced a definitive status (e.g. 403), keep it and
    // record the GET failure as context instead of discarding the answer.
    if (head) return finish(classifyHttpResult(url, head), head, getError);
    return finish("UNKNOWN", null, headError ?? getError);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Batch execution
 * ──────────────────────────────────────────────────────────────────────────── */

/** Runs `worker` over `items` with a fixed concurrency pool. Never rejects. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(Math.trunc(concurrency) || 1, 32));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runner(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

export async function checkSources(
  targets: readonly LinkTarget[],
  options: CheckOptions = {},
): Promise<CheckSummary> {
  const startedAt = new Date();
  const started = startedAt.getTime();
  let completed = 0;
  const outcomes = await mapWithConcurrency(
    targets,
    options.concurrency ?? DEFAULT_CONCURRENCY,
    async (target) => {
      const result = await checkLink(target.url, options);
      const outcome: LinkCheckOutcome = {
        sourceId: target.id,
        name: target.name,
        url: target.url,
        previousStatus: target.link_status,
        linkStatus: result.linkStatus,
        httpStatus: result.httpStatus,
        finalUrl: result.finalUrl,
        error: result.error,
        durationMs: result.durationMs,
        checkedAt: new Date().toISOString(),
        changed: result.linkStatus !== target.link_status,
      };
      completed += 1;
      options.onProgress?.(completed, targets.length, outcome);
      return outcome;
    },
  );

  const byStatus = Object.fromEntries(
    LINK_STATUS_VALUES.map((status) => [status, 0]),
  ) as Record<LinkStatusValue, number>;
  for (const outcome of outcomes) byStatus[outcome.linkStatus] += 1;

  const summary: CheckSummary = {
    total: targets.length,
    checked: outcomes.length,
    changed: outcomes.filter((o) => o.changed).length,
    byStatus,
    dead: outcomes.filter((o) => o.linkStatus === "DEAD"),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    persisted: false,
    historyWritten: 0,
  };

  // Preserve outcomes on the summary for callers that persist them later.
  (summary as CheckSummary & { outcomes: LinkCheckOutcome[] }).outcomes = outcomes;
  return summary;
}

export function getOutcomes(summary: CheckSummary): LinkCheckOutcome[] {
  return (summary as CheckSummary & { outcomes?: LinkCheckOutcome[] }).outcomes ?? [];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Selection
 * ──────────────────────────────────────────────────────────────────────────── */

export async function selectTargets(
  prisma: PrismaClient,
  selection: CheckSelection = {},
): Promise<LinkTarget[]> {
  const where: Prisma.SourceWhereInput = {};
  if (!selection.includeHidden) where.is_hidden = false;
  if (selection.ids?.length) where.id = { in: selection.ids };
  if (selection.only?.length) where.link_status = { in: selection.only };
  if (selection.staleBefore) where.last_verified = { lt: selection.staleBefore };

  const limit = selection.limit && selection.limit > 0 ? Math.trunc(selection.limit) : undefined;

  const rows = await prisma.source.findMany({
    where,
    select: { id: true, name: true, url: true, link_status: true, last_verified: true, is_hidden: true },
    // NULLS FIRST is the default in PostgreSQL for ASC, so never-checked links
    // are always at the head of the queue.
    orderBy: [{ last_verified: "asc" }, { id: "asc" }],
    ...(limit ? { take: limit } : {}),
  });

  return rows;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Persistence
 * ──────────────────────────────────────────────────────────────────────────── */

let linkReportsSupport: boolean | null = null;

/** Detects the optional history table once per process. */
export async function supportsLinkReports(prisma: PrismaClient): Promise<boolean> {
  if (linkReportsSupport !== null) return linkReportsSupport;
  try {
    const rows = await prisma.$queryRaw<Array<{ rel: string | null }>>`
      SELECT to_regclass('public.link_reports')::text AS rel
    `;
    linkReportsSupport = Boolean(rows[0]?.rel);
  } catch {
    linkReportsSupport = false;
  }
  return linkReportsSupport;
}

export interface PersistResult {
  updated: number;
  historyWritten: number;
  historyAvailable: boolean;
}

/**
 * Writes link_status + last_verified to `sources` and appends one
 * `link_reports` row per check when the history table exists.
 *
 * Callers must have explicit authorisation (CLI `--write`, admin action or
 * cron with CRON_SECRET). URLs are never modified here.
 */
export async function persistOutcomes(
  prisma: PrismaClient,
  outcomes: readonly LinkCheckOutcome[],
  options: { writeHistory?: boolean } = {},
): Promise<PersistResult> {
  if (outcomes.length === 0) {
    return { updated: 0, historyWritten: 0, historyAvailable: false };
  }

  const date = todayIsoDate();
  const historyAvailable = options.writeHistory === false ? false : await supportsLinkReports(prisma);
  let updated = 0;
  let historyWritten = 0;
  const CHUNK = 25;

  for (let index = 0; index < outcomes.length; index += CHUNK) {
    const chunk = outcomes.slice(index, index + CHUNK);
    const operations: Prisma.PrismaPromise<unknown>[] = [];
    for (const outcome of chunk) {
      operations.push(
        prisma.source.update({
          where: { id: outcome.sourceId },
          data: { link_status: outcome.linkStatus, last_verified: date },
        }),
      );
      if (historyAvailable) {
        operations.push(
          prisma.linkReport.create({
            data: {
              source_id: outcome.sourceId,
              url: outcome.url,
              status_code: outcome.httpStatus,
              final_url: outcome.finalUrl,
              link_status: outcome.linkStatus,
              error: outcome.error?.slice(0, 500) ?? null,
              duration_ms: outcome.durationMs,
              checked_at: new Date(outcome.checkedAt),
            },
          }),
        );
      }
    }

    const results = await prisma.$transaction(operations);
    updated += chunk.length;
    if (historyAvailable) historyWritten += results.length - chunk.length;
  }

  return { updated, historyWritten, historyAvailable };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Admin statistics
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LinkHealthStats {
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

export async function getLinkHealthStats(
  prisma: PrismaClient,
  now = new Date(),
): Promise<LinkHealthStats> {
  const cutoff7 = isoDateDaysAgo(7, now);
  const cutoff30 = isoDateDaysAgo(30, now);
  const today = todayIsoDate(now);

  const [grouped, total, hidden, stale7, stale30, neverChecked, checkedToday, latest] =
    await Promise.all([
      prisma.source.groupBy({ by: ["link_status"], _count: { _all: true } }),
      prisma.source.count({ where: { is_hidden: false } }),
      prisma.source.count({ where: { is_hidden: true } }),
      prisma.source.count({ where: { is_hidden: false, last_verified: { lt: cutoff7 } } }),
      prisma.source.count({ where: { is_hidden: false, last_verified: { lt: cutoff30 } } }),
      prisma.source.count({ where: { is_hidden: false, last_verified: null } }),
      prisma.source.count({ where: { is_hidden: false, last_verified: today } }),
      supportsLinkReports(prisma).then(async (available) => {
        if (!available) {
          const aggregate = await prisma.source.aggregate({ _max: { last_verified: true } });
          return aggregate._max.last_verified;
        }
        const rows = await prisma.$queryRaw<Array<{ at: Date | null }>>`
          SELECT MAX(checked_at) AS at FROM link_reports
        `;
        return rows[0]?.at ? new Date(rows[0].at).toISOString() : null;
      }),
    ]);

  const counts = new Map<string, number>();
  for (const row of grouped) counts.set(row.link_status, Number(row._count._all));
  const live = counts.get("LIVE") ?? 0;
  const redirect = counts.get("REDIRECT") ?? 0;
  const unknown = counts.get("UNKNOWN") ?? 0;
  const unverified = counts.get("UNVERIFIED") ?? 0;
  const dead = counts.get("DEAD") ?? 0;

  return {
    total,
    hidden,
    live,
    redirect,
    unknown,
    unverified,
    dead,
    stale7,
    stale30,
    neverChecked,
    checkedToday,
    healthPercent: total > 0 ? Math.round(((live + redirect) / total) * 1000) / 10 : 0,
    lastCheckedAt: latest ?? null,
    historyAvailable: await supportsLinkReports(prisma),
  };
}
