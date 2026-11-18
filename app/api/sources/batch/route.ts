/**
 * File: app/api/sources/batch/route.ts
 * Purpose: Batch source lookup for the personal dashboard and comparison
 * table. Accepts up to 100 comma-separated ids and preserves their order.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_CACHE } from "@/lib/cache";
import { getSourcesByIds } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "أضف معرّف مصدر واحداً على الأقل." },
      { status: 400 },
    );
  }

  try {
    const sources = await getSourcesByIds(ids);
    return NextResponse.json(
      { count: sources.length, sources },
      { headers: PUBLIC_CACHE },
    );
  } catch (error) {
    console.error("[api/sources/batch] failed:", error);
    const failure = toApiFailure(error, "تعذر تحميل المصادر. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
