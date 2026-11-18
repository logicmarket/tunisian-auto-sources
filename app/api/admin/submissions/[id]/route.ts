/**
 * File: app/api/admin/submissions/[id]/route.ts
 * Purpose: Approve or reject one submission. Approval publishes the source
 * into the main table with an auto-generated slug and queues an email.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { isAdminAuthorized } from "@/lib/phase4/admin";
import { reviewSubmission } from "@/lib/phase4/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  action?: unknown;
  note?: unknown;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json(
      { error: "غير مصرّح بالدخول إلى لوحة المراجعة." },
      { status: 401 },
    );
  }

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "معرّف الاقتراح غير صالح." },
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

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "الإجراء المطلوب غير معروف." },
      { status: 400 },
    );
  }

  try {
    const result = await reviewSubmission(
      id,
      body.action,
      typeof body.note === "string" ? body.note : undefined,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      submission: result.submission,
      sourceId: result.sourceId,
    });
  } catch (error) {
    console.error(`[api/admin/submissions/${id}] failed:`, error);
    const failure = toApiFailure(error, "تعذر تنفيذ المراجعة. جرّب مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
