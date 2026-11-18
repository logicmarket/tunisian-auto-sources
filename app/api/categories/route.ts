import { NextResponse } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_LONG_CACHE } from "@/lib/cache";
import { getCategoryCounts } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/categories
 * Returns every controlled-vocabulary value with its source count,
 * grouped by system, task, language, and link status.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const categories = await getCategoryCounts();

    return NextResponse.json(categories, {
      headers: PUBLIC_LONG_CACHE,
    });
  } catch (error) {
    console.error("[api/categories] Failed to aggregate categories:", error);
    const failure = toApiFailure(error, "تعذر جلب التصنيفات. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
