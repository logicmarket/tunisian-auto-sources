/**
 * File: app/api/search/route.ts
 * Purpose: Instant, grouped search endpoint used by the header overlay and
 * the hero search bar. Returns sources, categories, and OBD codes.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_CACHE } from "@/lib/cache";
import { searchPortal } from "@/lib/search-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      {
        query,
        total: 0,
        sources: [],
        categories: [],
        obd: [],
        hint: "اكتب حرفين على الأقل لبدء البحث.",
      },
      { headers: PUBLIC_CACHE },
    );
  }

  try {
    const result = await searchPortal(query, {
      sourceLimit: Math.min(12, Math.max(1, Number(params.get("limit") ?? 8))),
      obdLimit: 6,
      categoryLimit: 6,
    });

    return NextResponse.json(result, {
      headers: PUBLIC_CACHE,
    });
  } catch (error) {
    console.error("[api/search] Search failed:", error);
    const failure = toApiFailure(error, "تعذر إكمال البحث. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
