/**
 * File: app/api/cron/check-links/route.ts
 * Purpose: Scheduled link-health sweep for Vercel Cron.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the
 * CRON_SECRET environment variable exists on the project. Manual callers may
 * send `x-cron-secret` instead.
 *
 * Each invocation checks a small batch (default 25, max 40) because Vercel
 * functions have a request duration limit. Stale links are prioritised, so a
 * daily cron rotates through the whole catalogue without a long single run.
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  checkSources,
  getLinkHealthStats,
  getOutcomes,
  isoDateDaysAgo,
  persistOutcomes,
  selectTargets,
} from "@/lib/link-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Local development without a secret is allowed; production must set one.
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (authorization.startsWith("Bearer ")) {
    if (safeEqual(authorization.slice(7).trim(), secret)) return true;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  return Boolean(headerSecret && safeEqual(headerSecret, secret));
}

async function run(request: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "");
  const limit = Math.min(40, Math.max(1, Math.trunc(limitParam) || 25));
  const staleParam = Number(request.nextUrl.searchParams.get("staleDays") ?? "");
  const staleDays = Number.isFinite(staleParam) && staleParam > 0 ? staleParam : 1;

  try {
    const targets = await selectTargets(prisma, {
      staleBefore: isoDateDaysAgo(staleDays),
      includeHidden: false,
      limit,
    });

    if (targets.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          message: "No stale links in this window.",
          stats: await getLinkHealthStats(prisma),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const summary = await checkSources(targets, { concurrency: 8, timeoutMs: 8_000 });
    const persisted = await persistOutcomes(prisma, getOutcomes(summary));
    summary.persisted = true;
    summary.historyWritten = persisted.historyWritten;

    console.info(
      `[cron/check-links] checked=${summary.checked} changed=${summary.changed} ` +
        `dead=${summary.byStatus.DEAD} unknown=${summary.byStatus.UNKNOWN}`,
    );

    return NextResponse.json(
      {
        ok: true,
        summary: {
          checked: summary.checked,
          changed: summary.changed,
          byStatus: summary.byStatus,
          durationMs: summary.durationMs,
          persisted: summary.persisted,
          historyWritten: summary.historyWritten,
        },
        stats: await getLinkHealthStats(prisma),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[cron/check-links] failed:", error);
    return NextResponse.json({ error: "Link check failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return run(request);
}
