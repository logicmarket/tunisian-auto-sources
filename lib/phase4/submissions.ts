/**
 * File: lib/phase4/submissions.ts
 * Purpose: Community source submissions on PostgreSQL: validation, duplicate
 * detection, IP rate limiting, optional reCAPTCHA v3 scoring, admin review,
 * publication into the main `sources` table and submitter notifications.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { toIso, toSubmissionRecord } from "@/lib/mappers";
import { ensureSeeded } from "@/lib/seed";
import { notifySubmitter } from "@/lib/phase4/notifications";
import {
  findSpamTerms,
  isValidHttpUrl,
  normalizeUrl,
  slugify,
  trackingId,
  validateContribution,
  LIMITS,
} from "@/lib/phase4/validation";
import type {
  ContributeInput,
  SubmissionPublic,
  SubmissionRecord,
} from "@/lib/types";

export const MAX_SUBMISSIONS_PER_HOUR = 3;

export type CreateSubmissionResult =
  | {
      ok: true;
      id: number;
      trackingId: string;
      status: "pending";
      message: string;
      emailQueued: boolean;
      flags: string[];
    }
  | {
      ok: false;
      httpStatus: number;
      error: string;
      errors?: Record<string, string>;
      duplicate?: { id: number; name: string; url: string; href: string };
      retryAfterMinutes?: number;
    };

export interface SubmissionMeta {
  ip: string;
  recaptchaToken?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function publicSubmission(row: SubmissionRecord): SubmissionPublic {
  return {
    id: row.id,
    trackingId: trackingId(row.id, row.created_at),
    name: row.name,
    url: row.url,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerNote: row.reviewer_note,
    publishedSourceId: row.published_source_id,
  };
}

async function findDuplicate(
  normalized: string,
): Promise<{ id: number; name: string; url: string } | null> {
  await ensureSeeded();

  const sources = await prisma.source.findMany({
    select: { id: true, name: true, url: true },
  });
  const sourceMatch = sources.find(
    (source) => normalizeUrl(source.url) === normalized,
  );
  if (sourceMatch) return sourceMatch;

  const pending = await prisma.submission.findFirst({
    where: { normalized_url: normalized, status: "pending" },
    select: { id: true, name: true, url: true },
  });

  return pending ?? null;
}

/** Live duplicate check used by the form before submit. */
export async function checkDuplicateUrl(
  url: string,
): Promise<{ duplicate: boolean; source?: { id: number; name: string; href: string } }> {
  await ensureSeeded();
  const normalized = normalizeUrl(url);
  if (!normalized) return { duplicate: false };

  const sources = await prisma.source.findMany({
    select: { id: true, name: true, url: true },
  });
  const match = sources.find(
    (source) => normalizeUrl(source.url) === normalized,
  );

  return match
    ? {
        duplicate: true,
        source: { id: match.id, name: match.name, href: `/sources/${match.id}` },
      }
    : { duplicate: false };
}

async function verifyRecaptcha(
  token: string | undefined,
  ip: string,
): Promise<{ score: number | null; flags: string[]; configured: boolean }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    return { score: null, flags: [], configured: false };
  }
  if (!token) {
    return { score: null, flags: ["recaptcha_token_missing"], configured: true };
  }

  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as {
      success?: boolean;
      score?: number;
    };

    if (!payload.success) {
      return { score: null, flags: ["recaptcha_failed"], configured: true };
    }

    const score =
      typeof payload.score === "number" ? Number(payload.score.toFixed(2)) : null;
    const flags: string[] = [];
    if (score !== null && score < 0.3) flags.push("low_recaptcha_score");
    return { score, flags, configured: true };
  } catch (error) {
    console.error("[contribute] reCAPTCHA verification failed:", error);
    return { score: null, flags: ["recaptcha_unavailable"], configured: true };
  }
}

export async function createSubmission(
  input: ContributeInput,
  meta: SubmissionMeta,
): Promise<CreateSubmissionResult> {
  await ensureSeeded();

  const validation = validateContribution(input);
  if (!validation.valid) {
    return {
      ok: false,
      httpStatus: 422,
      error: "راجع الحقول المطلوبة ثم أعد الإرسال.",
      errors: validation.errors,
    };
  }

  const spamTerms = findSpamTerms(input);
  if (spamTerms.length > 0) {
    return {
      ok: false,
      httpStatus: 422,
      error:
        "يحتوي الاقتراح على محتوى غير مسموح. نرجو إرسال مصدر تقني حقيقي فقط.",
    };
  }

  if (!isValidHttpUrl(input.url)) {
    return {
      ok: false,
      httpStatus: 422,
      error: "أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://",
      errors: { url: "رابط غير صالح." },
    };
  }

  const normalized = normalizeUrl(input.url);
  const duplicate = await findDuplicate(normalized);
  if (duplicate) {
    return {
      ok: false,
      httpStatus: 409,
      error: "هذا المصدر موجود بالفعل.",
      duplicate: {
        ...duplicate,
        href: `/sources/${duplicate.id}`,
      },
    };
  }

  const recent = await prisma.submission.count({
    where: {
      ip_address: meta.ip,
      created_at: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (recent >= MAX_SUBMISSIONS_PER_HOUR) {
    return {
      ok: false,
      httpStatus: 429,
      error:
        "لقد أرسلت 3 اقتراحات خلال الساعة الأخيرة. حاول بعد قليل أو راسلنا مباشرة.",
      retryAfterMinutes: 60,
    };
  }

  const recaptcha = await verifyRecaptcha(meta.recaptchaToken, meta.ip);
  const flags = [...recaptcha.flags];
  if (input.reason && input.reason.length > LIMITS.reasonMax) {
    flags.push("long_reason");
  }

  const statusToken = randomBytes(16).toString("hex");
  const created = await prisma.submission.create({
    data: {
      url: input.url.trim(),
      normalized_url: normalized,
      name: input.name.trim(),
      description_ar: input.description_ar.trim(),
      suggested_system: input.suggested_system,
      suggested_task: input.suggested_task,
      reason: input.reason?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      status: "pending",
      status_token: statusToken,
      recaptcha_score: recaptcha.score,
      spam_flags: flags.length > 0 ? JSON.stringify(flags) : null,
      ip_address: meta.ip,
    },
    select: { id: true, created_at: true },
  });

  const id = created.id;
  const createdAt = toIso(created.created_at) ?? nowIso();
  const email = input.email?.trim();

  if (email) {
    await notifySubmitter({
      recipient: email,
      subject: `تم استلام اقتراحك ${trackingId(id, createdAt)}`,
      body:
        `شكراً لمساهمتك في بوابة مصادر السيارات التونسية.\n\n` +
        `رقم المتابعة: ${trackingId(id, createdAt)}\n` +
        `المصدر: ${input.name.trim()}\n` +
        `الرابط: ${input.url.trim()}\n` +
        `الحالة: قيد المراجعة\n\n` +
        `يمكنك متابعة الحالة عبر: /contribute/status/${id}`,
    });
  }

  return {
    ok: true,
    id,
    trackingId: trackingId(id, createdAt),
    status: "pending",
    message: "شكراً! تم استلام اقتراحك وسنراجعه قريباً.",
    emailQueued: Boolean(email),
    flags,
  };
}

export async function getSubmission(id: number): Promise<SubmissionPublic | null> {
  await ensureSeeded();
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await prisma.submission.findUnique({ where: { id } });
  return row ? publicSubmission(toSubmissionRecord(row)) : null;
}

export async function getSubmissionByTracking(
  reference: string,
): Promise<SubmissionPublic | null> {
  await ensureSeeded();
  const value = reference.trim();

  // Accept both the numeric path id and the human tracking number.
  const numeric = Number(value.replace(/^SUB-\d{4}-/i, ""));
  if (Number.isInteger(numeric) && numeric > 0) {
    return getSubmission(numeric);
  }

  const row = await prisma.submission.findUnique({
    where: { status_token: value },
  });
  return row ? publicSubmission(toSubmissionRecord(row)) : null;
}

export async function listSubmissions(
  status?: SubmissionRecord["status"] | "all",
): Promise<SubmissionRecord[]> {
  await ensureSeeded();

  const rows = await prisma.submission.findMany({
    where: !status || status === "all" ? {} : { status },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });

  return rows.map(toSubmissionRecord);
}

export async function getSubmissionCounts(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}> {
  await ensureSeeded();
  const rows = await prisma.submission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of rows) {
    if (row.status === "pending") counts.pending = row._count._all;
    if (row.status === "approved") counts.approved = row._count._all;
    if (row.status === "rejected") counts.rejected = row._count._all;
    counts.total += row._count._all;
  }
  return counts;
}

export type ReviewResult =
  | {
      ok: true;
      submission: SubmissionPublic;
      sourceId: number | null;
      message: string;
    }
  | { ok: false; httpStatus: number; error: string };

export async function reviewSubmission(
  id: number,
  action: "approve" | "reject",
  note?: string,
): Promise<ReviewResult> {
  await ensureSeeded();
  const row = await prisma.submission.findUnique({ where: { id } });

  if (!row) {
    return { ok: false, httpStatus: 404, error: "الاقتراح غير موجود." };
  }
  if (row.status !== "pending") {
    return {
      ok: false,
      httpStatus: 409,
      error: "تمت مراجعة هذا الاقتراح مسبقاً.",
    };
  }

  if (action === "reject") {
    await prisma.submission.update({
      where: { id },
      data: {
        status: "rejected",
        reviewer_note: note?.trim() || null,
        reviewed_at: new Date(),
      },
    });

    const updated = await getSubmission(id);
    if (row.email) {
      await notifySubmitter({
        recipient: row.email,
        subject: `تحديث حالة اقتراحك ${trackingId(row.id, toIso(row.created_at))}`,
        body:
          `شكراً لاقتراحك «${row.name}».\n\n` +
          `بعد المراجعة، لم يتم اعتماد المصدر في الوقت الحالي لأنه لا يلبي معايير النشر.` +
          (note?.trim() ? `\n\nملاحظة المراجع: ${note.trim()}` : "") +
          `\n\nنقدّر مساهمتك وننتظر اقتراحات أخرى.`,
      });
    }
    return {
      ok: true,
      submission: updated!,
      sourceId: null,
      message: "تم رفض الاقتراح وإبلاغ صاحبه إن وُجد بريد.",
    };
  }

  // Approval: re-check duplicates because another submission may have been
  // approved while this one was waiting.
  const duplicate = await prisma.source.findFirst({
    where: { url: { equals: row.url, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (duplicate) {
    return {
      ok: false,
      httpStatus: 409,
      error: `المصدر موجود بالفعل في قاعدة البيانات (#${duplicate.id}).`,
    };
  }

  const slug = `${slugify(row.name)}-${row.id}`;
  const noteText = note?.trim()
    ? `${note.trim()}`
    : `مصدر مقترح من المجتمع — اقتراح #${row.id}`;

  let sourceId = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const inserted = await tx.source.create({
        data: {
          name: row.name,
          url: row.url,
          description_ar: row.description_ar,
          description_fr: null,
          category_system: row.suggested_system,
          category_task: row.suggested_task,
          language: "Arabic",
          link_status: "UNVERIFIED",
          rating: 0,
          notes: noteText,
          slug,
          submission_id: row.id,
        },
        select: { id: true },
      });

      sourceId = inserted.id;

      await tx.submission.update({
        where: { id: row.id },
        data: {
          status: "approved",
          reviewer_note: note?.trim() || null,
          reviewed_at: new Date(),
          published_source_id: sourceId,
        },
      });
    });
  } catch (error) {
    console.error("[submissions] approval failed:", error);
    return {
      ok: false,
      httpStatus: 500,
      error: "تعذر نشر المصدر. تحقق من صحة البيانات وحاول مرة أخرى.",
    };
  }

  const updated = await getSubmission(id);
  if (row.email) {
    await notifySubmitter({
      recipient: row.email,
      subject: `تم نشر اقتراحك ${trackingId(row.id, toIso(row.created_at))}`,
      body:
        `شكراً لمساهمتك!\n\n` +
        `تمت الموافقة على المصدر «${row.name}» ونشره في البوابة.\n` +
        `صفحة المصدر: /sources/${sourceId}\n` +
        (note?.trim() ? `ملاحظة المراجع: ${note.trim()}\n` : "") +
        `\nننتظر اقتراحاتك القادمة.`,
    });
  }

  return {
    ok: true,
    submission: updated!,
    sourceId,
    message: "تمت الموافقة ونشر المصدر في قاعدة البيانات.",
  };
}
