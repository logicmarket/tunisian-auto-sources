/**
 * File: app/api/contribute/status/[id]/route.ts
 * Purpose: Public, privacy-safe status lookup for a submission.
 */

import { NextResponse } from "next/server";
import { getSubmission } from "@/lib/phase4/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "رقم المتابعة غير صالح." },
      { status: 400 },
    );
  }

  try {
    const submission = await getSubmission(id);
    if (!submission) {
      return NextResponse.json(
        { error: "لم نجد اقتراحاً بهذا الرقم." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { submission },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`[api/contribute/status/${id}] failed:`, error);
    return NextResponse.json(
      { error: "تعذر تحميل حالة الاقتراح. جرّب مرة أخرى." },
      { status: 500 },
    );
  }
}
