/**
 * File: app/api/sources/[id]/rate/route.ts
 * Purpose: Create or edit this visitor's rating. Enforces one rating per
 * browser, hides the average below three ratings, locks comments until the
 * visitor has rated three sources, and flags extreme voting patterns.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_SHORT_CACHE } from "@/lib/cache";
import {
  getRatingSummary,
  RatingError,
  upsertRating,
} from "@/lib/phase4/ratings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  stars?: unknown;
  comment?: unknown;
  visitorId?: unknown;
  helpful?: unknown;
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "تعذر قراءة البيانات المرسلة." },
      { status: 400 },
    );
  }

  try {
    const result = await upsertRating({
      sourceId,
      visitorId: typeof body.visitorId === "string" ? body.visitorId : "",
      stars: Number(body.stars),
      comment:
        typeof body.comment === "string" ? body.comment : undefined,
      helpful:
        typeof body.helpful === "boolean" ? body.helpful : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        currentRating: result.summary.average,
        totalRatings: result.summary.total,
        average: result.summary.average,
        total: result.summary.total,
        showAverage: result.summary.showAverage,
        visitorRating: result.summary.visitorRating,
        visitorComment: result.summary.visitorComment,
        visitorHelpful: result.summary.visitorHelpful,
        commentAccepted: result.commentAccepted,
        commentNotice: result.commentNotice,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RatingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error(`[api/sources/${sourceId}/rate] failed:`, error);
    const failure = toApiFailure(error, "تعذر تسجيل التقييم. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}

/** Convenience GET so a widget can refresh without a second URL. */
export async function GET(
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

  const visitorId = request.nextUrl.searchParams.get("visitorId");

  try {
    const summary = await getRatingSummary(sourceId, visitorId);
    return NextResponse.json(
      {
        average: summary.average,
        total: summary.total,
        visitorRating: summary.visitorRating,
        visitorComment: summary.visitorComment,
        visitorHelpful: summary.visitorHelpful,
        showAverage: summary.showAverage,
      },
      { headers: PUBLIC_SHORT_CACHE },
    );
  } catch (error) {
    console.error(`[api/sources/${sourceId}/rate GET] failed:`, error);
    const failure = toApiFailure(error, "تعذر تحميل التقييمات. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
