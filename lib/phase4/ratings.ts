/**
 * File: lib/phase4/ratings.ts
 * Purpose: Hardened, account-free rating system on PostgreSQL.
 *
 * Anti-fraud rules preserved 1:1 from the SQLite implementation:
 * - one row per (source, visitor) enforced by a UNIQUE constraint + upsert
 * - the average is hidden until at least 3 ratings exist
 * - visitors who only submit 5s or only 1s are flagged for review
 * - comments are only accepted after the visitor has rated 3 sources
 * - ratings are editable and carry created/updated timestamps
 */

import { prisma } from "@/lib/db";
import { toRatingRowView, type RatingRowView } from "@/lib/mappers";
import { ensureSeeded } from "@/lib/seed";
import type { RatingSummary } from "@/lib/types";

export const MIN_RATINGS_FOR_AVERAGE = 3;
export const MIN_RATINGS_FOR_COMMENT = 3;
export const MAX_COMMENT_LENGTH = 140;
export const MAX_STARS = 5;

export class RatingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_source"
      | "invalid_visitor"
      | "invalid_stars"
      | "invalid_comment"
      | "comment_locked",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "RatingError";
  }
}

const VISITOR_PATTERN = /^[A-Za-z0-9._:-]{8,80}$/;

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && VISITOR_PATTERN.test(value);
}

export interface RatingMutationInput {
  sourceId: number;
  visitorId: string;
  stars: number;
  comment?: string | null;
  helpful?: boolean | null;
}

export interface RatingMutationResult {
  summary: RatingSummary;
  commentAccepted: boolean;
  commentNotice: string | null;
  message: string;
}

async function assertSourceExists(sourceId: number): Promise<void> {
  await ensureSeeded();
  const row = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { id: true },
  });
  if (!row) {
    throw new RatingError("المصدر غير موجود.", "invalid_source", 404);
  }
}

export async function getVisitorRatingCount(
  visitorId: string,
  excludeSourceId?: number,
): Promise<number> {
  await ensureSeeded();
  return prisma.rating.count({
    where: {
      visitor_id: visitorId,
      ...(typeof excludeSourceId === "number"
        ? { source_id: { not: excludeSourceId } }
        : {}),
    },
  });
}

export async function getRatingSummary(
  sourceId: number,
  visitorId?: string | null,
): Promise<RatingSummary> {
  await ensureSeeded();

  const [aggregate, visitor] = await Promise.all([
    prisma.rating.aggregate({
      where: { source_id: sourceId },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    visitorId && isValidVisitorId(visitorId)
      ? prisma.rating.findUnique({
          where: {
            source_id_visitor_id: { source_id: sourceId, visitor_id: visitorId },
          },
        })
      : Promise.resolve(null),
  ]);

  const total = aggregate._count._all;
  const average =
    total > 0 && aggregate._avg.stars !== null
      ? Number(aggregate._avg.stars.toFixed(1))
      : 0;

  const view: RatingRowView | null = visitor ? toRatingRowView(visitor) : null;

  return {
    average,
    total,
    visitorRating: view?.stars ?? null,
    visitorComment: view?.comment ?? null,
    visitorHelpful:
      view?.helpful === 1 ? true : view?.helpful === 0 ? false : null,
    showAverage: total >= MIN_RATINGS_FOR_AVERAGE,
    flagged: view?.flagged === 1,
    updatedAt: view?.updated_at ?? null,
  };
}

/**
 * Flags a visitor whose entire history is extreme (all 5s or all 1s) once
 * they have at least three ratings. This is a review flag, not a deletion:
 * a human decides whether to keep the ratings.
 */
async function flagExtremeVisitor(visitorId: string): Promise<void> {
  const aggregate = await prisma.rating.aggregate({
    where: { visitor_id: visitorId },
    _count: { _all: true },
    _min: { stars: true },
    _max: { stars: true },
  });

  if (aggregate._count._all < 3) return;

  const allFive = aggregate._min.stars === 5;
  const allOne = aggregate._max.stars === 1;
  if (!allFive && !allOne) return;

  await prisma.rating.updateMany({
    where: { visitor_id: visitorId },
    data: {
      flagged: 1,
      flag_reason: allFive ? "all_5_extreme" : "all_1_extreme",
    },
  });
}

export async function upsertRating(
  input: RatingMutationInput,
): Promise<RatingMutationResult> {
  await assertSourceExists(input.sourceId);

  if (!isValidVisitorId(input.visitorId)) {
    throw new RatingError(
      "معرّف الزائر غير صالح. أعد تحميل الصفحة وحاول مرة أخرى.",
      "invalid_visitor",
    );
  }

  const stars = Number(input.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > MAX_STARS) {
    throw new RatingError(
      "اختر تقييماً من 1 إلى 5 نجوم.",
      "invalid_stars",
    );
  }

  const existing = await prisma.rating.findUnique({
    where: {
      source_id_visitor_id: {
        source_id: input.sourceId,
        visitor_id: input.visitorId,
      },
    },
  });

  // Comments unlock only after the visitor has rated other sources at least
  // three times. Existing comments remain editable afterwards.
  const priorRatings = await getVisitorRatingCount(
    input.visitorId,
    input.sourceId,
  );
  const commentProvided =
    typeof input.comment === "string" && input.comment.trim().length > 0;
  const canComment = priorRatings >= MIN_RATINGS_FOR_COMMENT;

  let comment: string | null = existing?.comment ?? null;
  // Only true when this request actually stored a comment. A star-only
  // update must not unlock the comment box in the widget.
  let commentAccepted = false;
  let commentNotice: string | null = null;

  if (commentProvided) {
    const trimmed = input.comment!.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      throw new RatingError(
        `التعليق يجب ألا يتجاوز ${MAX_COMMENT_LENGTH} حرفاً.`,
        "invalid_comment",
      );
    }
    if (!canComment) {
      commentNotice =
        "تم حفظ النجوم. التعليقات تُفتح بعد تقييم 3 مصادر مختلفة — شكراً لمساهمتك.";
    } else {
      comment = trimmed;
      commentAccepted = true;
    }
  }

  const helpful =
    typeof input.helpful === "boolean"
      ? input.helpful
        ? 1
        : 0
      : (existing?.helpful ?? null);

  await prisma.rating.upsert({
    where: {
      source_id_visitor_id: {
        source_id: input.sourceId,
        visitor_id: input.visitorId,
      },
    },
    create: {
      source_id: input.sourceId,
      visitor_id: input.visitorId,
      stars,
      comment,
      helpful,
    },
    update: {
      stars,
      comment,
      helpful,
    },
  });

  await flagExtremeVisitor(input.visitorId);
  const summary = await getRatingSummary(input.sourceId, input.visitorId);

  const message = summary.showAverage
    ? "شكراً! تم تسجيل تقييمك وتحديث المتوسط."
    : "شكراً! تم تسجيل تقييمك. سيظهر المتوسط بعد 3 تقييمات.";

  return { summary, commentAccepted, commentNotice, message };
}

/** Public aggregate used by search ranking (one query per result set). */
export async function getCommunityRatingMap(
  sourceIds: number[],
): Promise<Map<number, { average: number; total: number }>> {
  await ensureSeeded();
  if (sourceIds.length === 0) return new Map();

  const rows = await prisma.rating.groupBy({
    by: ["source_id"],
    where: { source_id: { in: sourceIds } },
    _avg: { stars: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [
      row.source_id,
      {
        average: Number(row._avg.stars ?? 0),
        total: row._count._all,
      },
    ]),
  );
}
