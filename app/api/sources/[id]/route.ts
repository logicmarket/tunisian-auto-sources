import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { PUBLIC_LONG_CACHE } from "@/lib/cache";
import { getSourceById } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sources/:id — returns a single source record. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "معرّف المصدر يجب أن يكون رقماً صحيحاً موجباً." },
      { status: 400 },
    );
  }

  try {
    const source = await getSourceById(id);

    if (!source) {
      return NextResponse.json(
        { error: `لا يوجد مصدر بالمعرّف ${id}.` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { source },
      { headers: PUBLIC_LONG_CACHE },
    );
  } catch (error) {
    console.error(`[api/sources/${id}] Failed to fetch source:`, error);
    const failure = toApiFailure(error, "تعذر جلب المصدر. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
