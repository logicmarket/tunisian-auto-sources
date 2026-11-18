/**
 * File: app/api/diagnosis/codes/route.ts
 * Purpose: Debounced typeahead endpoint for Path A. Searches code, Arabic
 * name and English name across the 442-row OBD catalogue.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_CACHE } from "@/lib/cache";
import { searchDiagnosisCodes } from "@/lib/phase4/diagnosis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    20,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 8) || 8),
  );

  if (query.length < 1) {
    return NextResponse.json(
      { query, count: 0, codes: [] },
      { headers: PUBLIC_CACHE },
    );
  }

  try {
    const codes = await searchDiagnosisCodes(query, limit);
    return NextResponse.json(
      { query, count: codes.length, codes },
      { headers: PUBLIC_CACHE },
    );
  } catch (error) {
    console.error("[api/diagnosis/codes] search failed:", error);
    return NextResponse.json(
      { error: "تعذر البحث في أكواد OBD. جرّب مرة أخرى." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
