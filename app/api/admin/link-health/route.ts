/**
 * File: app/api/admin/link-health/route.ts
 * Purpose: Admin API for the link-health dashboard.
 *
 *   GET  /api/admin/link-health            stats + paginated queue
 *   GET  /api/admin/link-health?format=csv downloadable inventory
 *   POST /api/admin/link-health            { action: "recheck", ids?, limit? }
 *
 * Auth: `x-admin-token` header or `admin_token` cookie (lib/phase4/admin).
 * All responses are `no-store`; no URL is ever rewritten by this route.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/phase4/admin";
import { prisma } from "@/lib/db";
import {
  checkSources,
  getLinkHealthStats,
  getOutcomes,
  isProblemStatus,
  persistOutcomes,
  selectTargets,
} from "@/lib/link-health";
import {
  getRecentReports,
  listHealthSources,
  normalizeStatusFilter,
  toCsv,
} from "@/lib/link-health-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json(
      { error: "غير مصرّح بالدخول إلى لوحة صحة الروابط." },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const format = params.get("format");

  try {
    const status = normalizeStatusFilter(params.get("status"));
    const hiddenParam = params.get("hidden");
    const hidden =
      hiddenParam === "all" || hiddenParam === "only" ? hiddenParam : "exclude";
    const staleDays = Number(params.get("stale") ?? "");
    const query = params.get("q") ?? undefined;
    const sortParam = params.get("sort");
    const sort =
      sortParam === "name" || sortParam === "status" || sortParam === "recent"
        ? sortParam
        : "queue";

    if (format === "csv") {
      const all = await listHealthSources(prisma, {
        status,
        hidden,
        staleDays: Number.isFinite(staleDays) && staleDays > 0 ? staleDays : null,
        query,
        page: 1,
        pageSize: 200,
        sort: "queue",
      });
      const csv = toCsv(all.rows);
      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="link-health-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const [stats, list, recent] = await Promise.all([
      getLinkHealthStats(prisma),
      listHealthSources(prisma, {
        status,
        hidden,
        staleDays: Number.isFinite(staleDays) && staleDays > 0 ? staleDays : null,
        query,
        page: Number(params.get("page") ?? 1),
        pageSize: Number(params.get("pageSize") ?? 25),
        sort,
      }),
      getRecentReports(prisma, 8).catch(() => []),
    ]);

    return NextResponse.json(
      {
        stats,
        ...list,
        recent,
        filters: { status, hidden, staleDays, query, sort },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/link-health] GET failed:", error);
    const message =
      error instanceof Error && /link_reports|does not exist/i.test(error.message)
        ? "جدول link_reports غير موجود. طبّق ترحيل Task 3 أولاً."
        : "تعذر تحميل بيانات صحة الروابط. جرّب مرة أخرى.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: "غير مصرّح بالدخول إلى لوحة صحة الروابط." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  if (input.action !== "recheck") {
    return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
  }

  const ids = Array.isArray(input.ids)
    ? input.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : undefined;
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(input.limit ?? 20)) || 20));
  const onlyParam = Array.isArray(input.only)
    ? input.only.map((status) => String(status))
    : normalizeStatusFilter(typeof input.only === "string" ? input.only : null);

  try {
    const targets = await selectTargets(prisma, {
      ids,
      only: onlyParam.length ? onlyParam : undefined,
      includeHidden: Boolean(input.includeHidden),
      limit: ids?.length ? undefined : limit,
    });

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "لا توجد روابط مطابقة للفحص.", summary: null, results: [] },
        { status: 404 },
      );
    }

    const summary = await checkSources(targets, { concurrency: 6, timeoutMs: 10_000 });
    const persisted = await persistOutcomes(prisma, getOutcomes(summary));
    summary.persisted = true;
    summary.historyWritten = persisted.historyWritten;

    return NextResponse.json(
      {
        summary: {
          total: summary.total,
          checked: summary.checked,
          changed: summary.changed,
          byStatus: summary.byStatus,
          durationMs: summary.durationMs,
          historyWritten: summary.historyWritten,
        },
        results: getOutcomes(summary).map((outcome) => ({
          ...outcome,
          isProblem: isProblemStatus(outcome.linkStatus),
        })),
        stats: await getLinkHealthStats(prisma),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/link-health] POST failed:", error);
    return NextResponse.json(
      { error: "تعذر إتمام الفحص. تحقق من اتصال قاعدة البيانات ثم أعد المحاولة." },
      { status: 500 },
    );
  }
}
