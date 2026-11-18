/**
 * File: app/api/diagnosis/symptoms/route.ts
 * Purpose: Path B endpoint. Accepts 1–5 symptom ids and an optional brand and
 * returns the top three conservative OBD candidates with sources.
 */

import { NextResponse, type NextRequest } from "next/server";
import { diagnoseBySymptoms } from "@/lib/phase4/diagnosis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  symptomIds?: unknown;
  brand?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "تعذر قراءة البيانات المرسلة." },
      { status: 400 },
    );
  }

  const rawIds = Array.isArray(body.symptomIds) ? body.symptomIds : [];
  const symptomIds = rawIds
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .slice(0, 5);

  if (symptomIds.length === 0) {
    return NextResponse.json(
      { error: "اختر عرضاً واحداً على الأقل من الأعراض." },
      { status: 400 },
    );
  }

  try {
    const result = await diagnoseBySymptoms(
      symptomIds,
      typeof body.brand === "string" ? body.brand : null,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (error) {
    console.error("[api/diagnosis/symptoms] failed:", error);
    return NextResponse.json(
      { error: "حدث خطأ في الاتصال. جرّب مرة أخرى." },
      { status: 500 },
    );
  }
}
