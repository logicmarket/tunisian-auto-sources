/**
 * File: app/api/sources/[id]/rating/route.ts
 * Purpose: GET the aggregate rating plus the current visitor's own rating.
 * The average is only exposed when at least three ratings exist.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_SHORT_CACHE } from "@/lib/cache";
import { getSourceById } from "@/lib/queries";
import {
  getRatingSummary,
  getVisitorRatingCount,
  isValidVisitorId,
  MIN_RATINGS_FOR_AVERAGE,
  MIN_RATINGS_FOR_COMMENT,
} from "@/lib/phase4/ratings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const visitorId = request.nextUrl.searchParams.get("visitorId")?.trim() ?? "";
  const validVisitor = isValidVisitorId(visitorId);

  try {
    const source = await getSourceById(sourceId);
    if (!source) {
      return NextResponse.json({ error: "المصدر غير موجود." }, { status: 404 });
    }

    const summary = await getRatingSummary(
      sourceId,
      validVisitor ? visitorId : null,
    );
    const priorRatings = validVisitor
      ? await getVisitorRatingCount(visitorId, sourceId)
      : 0;

    return NextResponse.json(
      {
        average: summary.average,
        total: summary.total,
        visitorRating: summary.visitorRating,
        visitorComment: summary.visitorComment,
        visitorHelpful: summary.visitorHelpful,
        showAverage: summary.total >= MIN_RATINGS_FOR_AVERAGE,
        flagged: summary.flagged,
        commentAllowed:
          validVisitor && priorRatings >= MIN_RATINGS_FOR_COMMENT,
        minRatingsForAverage: MIN_RATINGS_FOR_AVERAGE,
        minRatingsForComment: MIN_RATINGS_FOR_COMMENT,
        updatedAt: summary.updatedAt,
      },
      { headers: PUBLIC_SHORT_CACHE },
    );
  } catch (error) {
    console.error(`[api/sources/${sourceId}/rating] failed:`, error);
    const failure = toApiFailure(error, "تعذر تحميل التقييمات. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
