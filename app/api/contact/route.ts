/**
 * File: app/api/contact/route.ts
 * Purpose: Receive a short contact/suggestion message from the About page.
 * Messages are stored in PostgreSQL for editorial review.
 */

import { NextResponse, type NextRequest } from "next/server";
import { toApiFailure } from "@/lib/api-error";
import { addContactMessage } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS = new Set([
  "اقتراح مصدر",
  "رابط معطّل",
  "تصحيح معلومة",
  "ملاحظة عامة",
]);

interface ContactBody {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  website?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json(
      { error: "تعذر قراءة البيانات المرسلة." },
      { status: 400 },
    );
  }

  // Honeypot: bots fill every field, humans never see this one.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (message.length < 10) {
    return NextResponse.json(
      { error: "اكتب رسالة من 10 أحرف على الأقل." },
      { status: 400 },
    );
  }
  if (message.length > 3000) {
    return NextResponse.json(
      { error: "الرسالة طويلة جداً. اختصرها إلى 3000 حرف." },
      { status: 400 },
    );
  }
  if (!TOPICS.has(topic)) {
    return NextResponse.json(
      { error: "اختر نوع الرسالة من القائمة." },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "صيغة البريد الإلكتروني غير صحيحة." },
      { status: 400 },
    );
  }

  try {
    await addContactMessage({
      name: name || null,
      email: email || null,
      topic,
      message,
    });

    return NextResponse.json({
      ok: true,
      message: "تم استلام رسالتك. شكراً لمساهمتك في تحسين المنصة.",
    });
  } catch (error) {
    console.error("[api/contact] Failed to store message:", error);
    const failure = toApiFailure(error, "تعذر إرسال الرسالة. حاول مرة أخرى.");
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
