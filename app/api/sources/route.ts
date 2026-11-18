import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_CACHE } from "@/lib/cache";
import { listSources } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sources
 * Optional query params: ?system=engine&task=diagnosis&lang=fr&status=live
 * Supports flexible values (English slugs, Arabic labels) and pagination
 * via &limit=50&offset=0. `total` is the unpaginated match count.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const limitValue = params.get("limit");
    const offsetValue = params.get("offset");

    const filters = {
      system: params.get("system")?.trim() || undefined,
      task: params.get("task")?.trim() || undefined,
      language:
        params.get("lang")?.trim() ||
        params.get("language")?.trim() ||
        undefined,
      status: params.get("status")?.trim() || undefined,
    };

    const sources = await listSources({
      ...filters,
      limit: limitValue ? Number(limitValue) : undefined,
      offset: offsetValue ? Number(offsetValue) : undefined,
    });

    const allMatches = await listSources(filters);

    return NextResponse.json(
      {
        count: sources.length,
        total: allMatches.length,
        filters: {
          system: params.get("system"),
          task: params.get("task"),
          lang: params.get("lang") ?? params.get("language"),
          status: params.get("status"),
        },
        sources,
      },
      { headers: PUBLIC_CACHE },
    );
  } catch (error) {
    console.error("[api/sources] Failed to list sources:", error);
    const failure = toApiFailure(error, "تعذر جلب المصادر. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
