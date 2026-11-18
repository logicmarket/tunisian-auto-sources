/**
 * File: app/api/diagnosis/codes/[code]/route.ts
 * Purpose: Path A result payload: full code details, related codes, symptom
 * hints and recommended sources. Cached in-process for five minutes.
 */

import { NextResponse } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_LONG_CACHE } from "@/lib/cache";
import { diagnosisCache } from "@/lib/phase4/cache";
import { getDiagnosisCode } from "@/lib/phase4/diagnosis";
import type { DiagnosisCodeDetail } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const code = decodeURIComponent(params.code).trim().toUpperCase();

  if (!/^[A-Z][0-9A-F]{4}$/.test(code)) {
    return NextResponse.json(
      { error: "صيغة كود OBD غير صحيحة. مثال: P0301" },
      { status: 400 },
    );
  }

  const cacheKey = `diagnosis-code:${code}`;
  const cached = diagnosisCache.get(cacheKey) as
    | DiagnosisCodeDetail
    | undefined;
  if (cached) {
    return NextResponse.json(cached, {
      headers: PUBLIC_LONG_CACHE,
    });
  }

  try {
    const detail = await getDiagnosisCode(code);
    if (!detail) {
      return NextResponse.json(
        {
          error:
            "لم نجد هذا الكود في القاعدة. جرّب كوداً آخر أو اختر الأعراض.",
        },
        { status: 404 },
      );
    }

    diagnosisCache.set(cacheKey, detail);
    return NextResponse.json(detail, {
      headers: PUBLIC_LONG_CACHE,
    });
  } catch (error) {
    console.error(`[api/diagnosis/codes/${code}] failed:`, error);
    const failure = toApiFailure(error, "حدث خطأ في الاتصال. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
