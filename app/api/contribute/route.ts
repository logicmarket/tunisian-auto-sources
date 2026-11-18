/**
 * File: app/api/contribute/route.ts
 * Purpose: Accept a community submission. Validates, blocks spam, enforces
 * the 3-per-hour IP limit, deduplicates URLs and optionally scores reCAPTCHA.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSubmission } from "@/lib/phase4/submissions";
import type { ContributeInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "127.0.0.1"
  );
}

interface Body {
  url?: unknown;
  name?: unknown;
  description_ar?: unknown;
  suggested_system?: unknown;
  suggested_task?: unknown;
  reason?: unknown;
  email?: unknown;
  recaptchaToken?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "تعذر قراءة البيانات المرسلة." },
      { status: 400 },
    );
  }

  const input: ContributeInput = {
    url: typeof body.url === "string" ? body.url : "",
    name: typeof body.name === "string" ? body.name : "",
    description_ar:
      typeof body.description_ar === "string" ? body.description_ar : "",
    suggested_system:
      typeof body.suggested_system === "string" ? body.suggested_system : "",
    suggested_task:
      typeof body.suggested_task === "string" ? body.suggested_task : "",
    reason: typeof body.reason === "string" ? body.reason : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    recaptchaToken:
      typeof body.recaptchaToken === "string" ? body.recaptchaToken : undefined,
  };

  try {
    const result = await createSubmission(input, {
      ip: clientIp(request),
      recaptchaToken: input.recaptchaToken,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          errors: result.errors,
          duplicate: result.duplicate,
          retryAfterMinutes: result.retryAfterMinutes,
        },
        { status: result.httpStatus, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        trackingId: result.trackingId,
        status: result.status,
        message: result.message,
        statusUrl: `/contribute/status/${result.id}`,
        emailQueued: result.emailQueued,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/contribute] failed:", error);
    return NextResponse.json(
      { error: "تعذر إرسال الاقتراح. جرّب مرة أخرى." },
      { status: 500 },
    );
  }
}
