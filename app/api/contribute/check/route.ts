/**
 * File: app/api/contribute/check/route.ts
 * Purpose: Debounced duplicate-URL check for the contribute form.
 */

import { NextResponse, type NextRequest } from "next/server";
import { checkDuplicateUrl } from "@/lib/phase4/submissions";
import { isValidHttpUrl } from "@/lib/phase4/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!url || !isValidHttpUrl(url)) {
    return NextResponse.json(
      { duplicate: false, valid: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await checkDuplicateUrl(url);
    return NextResponse.json(
      { valid: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/contribute/check] failed:", error);
    return NextResponse.json(
      { error: "تعذر التحقق من الرابط. جرّب مرة أخرى." },
      { status: 500 },
    );
  }
}
