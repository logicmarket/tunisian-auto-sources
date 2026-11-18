/**
 * File: app/api/admin/link-health/[id]/route.ts
 * Purpose: Single-source admin actions.
 *
 *   PATCH  /api/admin/link-health/:id   { url?, link_status?, is_hidden?, notes? }
 *   DELETE /api/admin/link-health/:id   { confirm: "DELETE" }
 *
 * Safety: URL changes require an explicit PATCH body (the operator is the
 * confirmation); hard deletion additionally requires the literal token
 * "DELETE" so a stray click cannot remove a catalogue row.
 */

import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/phase4/admin";
import { prisma } from "@/lib/db";
import { validateSourcePatch } from "@/lib/link-health-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: "غير مصرّح بالدخول." }, { status: 401 });
  }

  const id = parseId(context.params.id);
  if (!id) return NextResponse.json({ error: "معرّف غير صالح." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const validated = validateSourcePatch(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const updated = await prisma.source.update({
      where: { id },
      data: validated.patch,
      select: {
        id: true,
        name: true,
        url: true,
        link_status: true,
        last_verified: true,
        is_hidden: true,
      },
    });

    // Audit trail: never log tokens or full request headers.
    console.info(
      `[link-health] admin updated source #${id}: ${Object.keys(validated.patch).join(", ")}`,
    );

    // Hidden/edited sources must disappear from ISR pages immediately.
    if (
      validated.patch.is_hidden !== undefined ||
      validated.patch.url !== undefined ||
      validated.patch.link_status !== undefined
    ) {
      revalidatePath("/");
      revalidatePath("/sources");
      revalidatePath(`/sources/${id}`);
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json(
      { source: updated, message: "تم حفظ التغيير." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`[link-health] PATCH source #${id} failed:`, error);
    const notFound =
      error instanceof Error && /record to update not found|P2025/i.test(error.message);
    return NextResponse.json(
      { error: notFound ? "المصدر غير موجود." : "تعذر حفظ التغيير." },
      { status: notFound ? 404 : 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } },
): Promise<NextResponse> {
  if (!isAdminAuthorized(request.headers)) {
    return NextResponse.json({ error: "غير مصرّح بالدخول." }, { status: 401 });
  }

  const id = parseId(context.params.id);
  if (!id) return NextResponse.json({ error: "معرّف غير صالح." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const confirm = (body as Record<string, unknown> | null)?.confirm;
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'لحذف المصدر نهائياً أرسل { "confirm": "DELETE" }. يُفضّل الإخفاء بدلاً من الحذف.' },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.source.findUnique({
      where: { id },
      select: { id: true, name: true, url: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "المصدر غير موجود." }, { status: 404 });
    }

    await prisma.source.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/sources");
    revalidatePath("/sitemap.xml");
    console.info(`[link-health] admin deleted source #${id} (${existing.url})`);

    return NextResponse.json(
      { deleted: existing, message: "تم حذف المصدر نهائياً." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`[link-health] DELETE source #${id} failed:`, error);
    return NextResponse.json({ error: "تعذر حذف المصدر." }, { status: 500 });
  }
}
