/**
 * File: app/api/admin/submissions/route.ts
 * Purpose: Admin-only submission inbox. Requires the ADMIN_TOKEN header
 * (`x-admin-token`) or cookie. Returns counts plus the requested status list.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { isAdminAuthorized } from "@/lib/phase4/admin";
import {
  getSubmissionCounts,
  listSubmissions,
} from "@/lib/phase4/submissions";
import type { SubmissionRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "approved", "rejected", "all"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json(
      { error: "غير مصرّح بالدخول إلى لوحة المراجعة." },
      { status: 401 },
    );
  }

  const requested =
    request.nextUrl.searchParams.get("status")?.trim() ?? "pending";
  const status = (STATUSES.has(requested)
    ? requested
    : "pending") as SubmissionRecord["status"] | "all";

  try {
    const [submissions, counts] = await Promise.all([
      listSubmissions(status),
      getSubmissionCounts(),
    ]);

    return NextResponse.json(
      { status, counts, submissions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/submissions] failed:", error);
    const failure = toApiFailure(error, "تعذر تحميل الاقتراحات. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
