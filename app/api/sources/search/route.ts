import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_CACHE } from "@/lib/cache";
import { searchSources } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sources/search?q=keyword&limit=20 — MiniSearch results. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "المعامل q مطلوب، مثال: /api/sources/search?q=diagnostic" },
      { status: 400 },
    );
  }

  if (query.length > 120) {
    return NextResponse.json(
      { error: "نص البحث طويل جداً (الحد الأقصى 120 حرفاً)." },
      { status: 400 },
    );
  }

  const requestedLimit = Number(params.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 20;

  try {
    const outcome = await searchSources(query, limit);

    return NextResponse.json(
      {
        query: outcome.query,
        count: outcome.count,
        engine: "minisearch",
        sources: outcome.results,
      },
      { headers: PUBLIC_CACHE },
    );
  } catch (error) {
    console.error("[api/sources/search] Search failed:", error);
    const failure = toApiFailure(error, "تعذر تنفيذ البحث. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
