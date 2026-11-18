/**
 * File: app/api/sources/[id]/feedback/route.ts
 * Purpose: Persist a star rating or a helpful yes/no vote for one source.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { addSourceFeedback } from "@/lib/feedback";
import { getSourceById } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FeedbackBody {
  kind?: unknown;
  value?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const sourceId = Number(params.id);
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    return NextResponse.json(
      { error: "معرّف المصدر غير صالح." },
      { status: 400 },
    );
  }

  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json(
      { error: "تعذر قراءة البيانات المرسلة." },
      { status: 400 },
    );
  }

  const kind = body.kind;
  const value = Number(body.value);

  if (kind !== "rating" && kind !== "helpful") {
    return NextResponse.json(
      { error: "نوع التقييم غير معروف." },
      { status: 400 },
    );
  }

  if (
    (kind === "rating" && (!Number.isInteger(value) || value < 1 || value > 5)) ||
    (kind === "helpful" && value !== 1 && value !== -1)
  ) {
    return NextResponse.json(
      { error: "قيمة التقييم خارج النطاق المسموح." },
      { status: 400 },
    );
  }

  try {
    const source = await getSourceById(sourceId);
    if (!source) {
      return NextResponse.json({ error: "المصدر غير موجود." }, { status: 404 });
    }

    const summary = await addSourceFeedback(sourceId, kind, value);
    return NextResponse.json({
      ok: true,
      message: "شكراً لك، تم تسجيل تقييمك.",
      summary,
    });
  } catch (error) {
    console.error(`[api/sources/${sourceId}/feedback] Failed:`, error);
    const failure = toApiFailure(error, "تعذر حفظ التقييم. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
