import MiniSearch from "minisearch";
import { rankByCommunity } from "./phase4/ranking";
import { getAllSources } from "./queries";
import type { SourceRecord } from "./types";
import { normalizeSearchText, tokenizeForSearch } from "./utils";

/**
 * Server-side MiniSearch index.
 *
 * The corpus is small (≈141 records), so the index is built in memory and
 * cached per process. It is rebuilt automatically when the row count or the
 * latest `updated_at` timestamp changes (e.g. after re-seeding in dev).
 */

interface SearchCache {
  index: MiniSearch<SourceRecord>;
  signature: string;
  records: SourceRecord[];
}

let cache: SearchCache | null = null;

function buildSignature(records: SourceRecord[]): string {
  const newest = records.reduce(
    (latest, record) => (record.updated_at > latest ? record.updated_at : latest),
    "",
  );
  return `${records.length}:${newest}`;
}

async function getSearchCache(): Promise<SearchCache> {
  const records = await getAllSources();
  const signature = buildSignature(records);

  if (cache && cache.signature === signature) return cache;

  const index = new MiniSearch<SourceRecord>({
    fields: [
      "name",
      "description_ar",
      "description_fr",
      "category_system",
      "category_task",
      "language",
      "notes",
    ],
    storeFields: ["id"],
    tokenize: tokenizeForSearch,
    processTerm: (term) => normalizeSearchText(term),
    searchOptions: {
      boost: {
        name: 4,
        category_system: 2,
        category_task: 1.8,
        description_ar: 1.4,
      },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "AND",
    },
  });

  index.addAll(records);
  cache = { index, signature, records };
  return cache;
}

export interface SearchOutcome {
  query: string;
  count: number;
  results: SourceRecord[];
}

/** Searches names, Arabic/French descriptions, categories, languages, notes. */
export async function searchSources(
  query: string,
  limit = 20,
): Promise<SearchOutcome> {
  const trimmed = query.trim();

  if (!trimmed) {
    return { query: "", count: 0, results: [] };
  }

  const { index, records } = await getSearchCache();
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));

  // Take a wider lexical slice so the rating blend can re-order results
  // without dropping strong matches that a 3.5★ source should outrank.
  const rawResults = index
    .search(trimmed)
    .slice(0, Math.min(120, safeLimit * 3));

  const results = (
    await rankByCommunity(
      rawResults.map((result) => ({
        id: Number(result.id),
        score: Number(result.score) || 0,
      })),
      records,
    )
  ).slice(0, safeLimit);

  return { query: trimmed, count: results.length, results };
}
