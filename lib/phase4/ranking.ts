/**
 * File: lib/phase4/ranking.ts
 * Purpose: Blend lexical relevance with community rating for search results.
 *
 * final = relevance_norm * 0.6 + rating_norm * 0.4
 *
 * Community ratings are used once at least three visitors have rated the
 * source; otherwise the curated editorial rating keeps the result stable.
 */

import { getCommunityRatingMap, MIN_RATINGS_FOR_AVERAGE } from "@/lib/phase4/ratings";
import type { SourceRecord } from "@/lib/types";

export interface RawSearchHit {
  id: number;
  score: number;
}

export async function rankByCommunity(
  hits: RawSearchHit[],
  records: SourceRecord[],
): Promise<SourceRecord[]> {
  if (hits.length === 0) return [];

  const byId = new Map(records.map((record) => [record.id, record]));
  const ratings = await getCommunityRatingMap(
    hits.map((hit) => Number(hit.id)),
  );

  const maxScore = hits.reduce(
    (max, hit) => Math.max(max, Number(hit.score) || 0),
    0,
  );

  return [...hits]
    .map((hit) => {
      const record = byId.get(Number(hit.id));
      if (!record) return null;

      const relevance = maxScore > 0 ? Number(hit.score) / maxScore : 0;
      const community = ratings.get(record.id);
      const ratingValue =
        community && community.total >= MIN_RATINGS_FOR_AVERAGE
          ? community.average
          : record.rating;
      const ratingNorm = Math.max(0, Math.min(1, ratingValue / 5));

      return {
        record,
        final: relevance * 0.6 + ratingNorm * 0.4,
      };
    })
    .filter(
      (entry): entry is { record: SourceRecord; final: number } =>
        entry !== null,
    )
    .sort(
      (a, b) =>
        b.final - a.final ||
        b.record.rating - a.record.rating ||
        a.record.id - b.record.id,
    )
    .map((entry) => entry.record);
}
