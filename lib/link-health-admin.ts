/**
 * File: lib/link-health-admin.ts
 * Purpose: Read/update helpers for the `/admin/link-health` dashboard. Every
 * function receives an already-authorised Prisma client; authorisation lives
 * in the API routes (`isAdminAuthorized`).
 *
 * Visibility rule: the dashboard lists hidden rows only when asked, while all
 * writes are audited through `link_reports` and `updated_at`.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  LINK_STATUS_VALUES,
  type LinkStatusValue,
  isoDateDaysAgo,
  parseExternalUrl,
} from "./link-health";

export interface AdminLinkRow {
  id: number;
  name: string;
  url: string;
  link_status: string;
  last_verified: string | null;
  is_hidden: boolean;
  category_system: string;
  category_task: string;
  language: string;
  rating: number;
  latest: {
    status_code: number | null;
    final_url: string | null;
    error: string | null;
    checked_at: string;
    link_status: string;
  } | null;
}

export interface ListHealthOptions {
  status?: string[];
  query?: string;
  hidden?: "all" | "only" | "exclude";
  staleDays?: number | null;
  page?: number;
  pageSize?: number;
  sort?: "queue" | "name" | "status" | "recent";
}

const MAX_PAGE_SIZE = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeStatusFilter(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "all") return [];
  const requested = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const aliases: Record<string, string[]> = {
    problem: ["DEAD", "UNKNOWN", "UNVERIFIED"],
    nonlive: ["DEAD", "UNKNOWN", "UNVERIFIED", "REDIRECT"],
    healthy: ["LIVE", "REDIRECT"],
  };

  const values = new Set<string>();
  for (const item of requested) {
    if (aliases[item]) {
      for (const status of aliases[item]) values.add(status);
    } else {
      values.add(item.toUpperCase());
    }
  }

  return [...values].filter((value) => (LINK_STATUS_VALUES as readonly string[]).includes(value));
}

export async function listHealthSources(
  prisma: PrismaClient,
  options: ListHealthOptions = {},
): Promise<{ rows: AdminLinkRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const pageSize = clamp(Math.trunc(options.pageSize ?? 25), 1, MAX_PAGE_SIZE);
  const requestedPage = Math.max(1, Math.trunc(options.page ?? 1));

  const where: Prisma.SourceWhereInput = {};
  if (options.hidden === "only") where.is_hidden = true;
  else if (options.hidden !== "all") where.is_hidden = false;
  if (options.status?.length) where.link_status = { in: options.status };
  if (options.staleDays) where.last_verified = { lt: isoDateDaysAgo(options.staleDays) };
  if (options.query?.trim()) {
    const query = options.query.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { url: { contains: query, mode: "insensitive" } },
      { category_system: { contains: query, mode: "insensitive" } },
    ];
  }

  const orderBy =
    options.sort === "name"
      ? [{ name: "asc" as const }, { id: "asc" as const }]
      : options.sort === "status"
        ? [{ link_status: "asc" as const }, { name: "asc" as const }]
        : options.sort === "recent"
          ? [{ last_verified: "desc" as const }, { id: "desc" as const }]
          : [{ last_verified: "asc" as const }, { id: "asc" as const }];

  const total = await prisma.source.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = clamp(requestedPage, 1, totalPages);

  const rows = await prisma.source.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      url: true,
      link_status: true,
      last_verified: true,
      is_hidden: true,
      category_system: true,
      category_task: true,
      language: true,
      rating: true,
      link_reports: {
        take: 1,
        orderBy: { checked_at: "desc" },
        select: {
          status_code: true,
          final_url: true,
          error: true,
          checked_at: true,
          link_status: true,
        },
      },
    },
  });

  return {
    rows: rows.map((row) => ({
      ...row,
      latest: row.link_reports[0]
        ? {
            ...row.link_reports[0],
            checked_at: row.link_reports[0].checked_at.toISOString(),
          }
        : null,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getRecentReports(
  prisma: PrismaClient,
  limit = 8,
): Promise<
  Array<{
    id: number;
    source_id: number;
    url: string;
    status_code: number | null;
    link_status: string;
    error: string | null;
    checked_at: string;
    source_name: string | null;
  }>
> {
  const rows = await prisma.linkReport.findMany({
    take: clamp(Math.trunc(limit), 1, 50),
    orderBy: { checked_at: "desc" },
    include: { source: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    source_id: row.source_id,
    url: row.url,
    status_code: row.status_code,
    link_status: row.link_status,
    error: row.error,
    checked_at: row.checked_at.toISOString(),
    source_name: row.source?.name ?? null,
  }));
}

export interface SourcePatch {
  url?: string;
  link_status?: string;
  is_hidden?: boolean;
  notes?: string | null;
}

export function validateSourcePatch(body: unknown): { patch: SourcePatch } | { error: string } {
  if (!body || typeof body !== "object") return { error: "طلب غير صالح." };
  const input = body as Record<string, unknown>;
  const patch: SourcePatch = {};

  if (input.url !== undefined) {
    const parsed = parseExternalUrl(String(input.url));
    if (!parsed) return { error: "الرابط يجب أن يكون عنوان HTTP أو HTTPS صالحاً." };
    patch.url = parsed;
  }

  if (input.link_status !== undefined) {
    const status = String(input.link_status).toUpperCase();
    if (!(LINK_STATUS_VALUES as readonly string[]).includes(status)) {
      return { error: "حالة الرابط غير معروفة." };
    }
    patch.link_status = status as LinkStatusValue;
  }

  if (input.is_hidden !== undefined) {
    if (typeof input.is_hidden !== "boolean") return { error: "قيمة الإخفاء يجب أن تكون صحيحة أو خاطئة." };
    patch.is_hidden = input.is_hidden;
  }

  if (input.notes !== undefined) {
    if (input.notes === null) patch.notes = null;
    else {
      const notes = String(input.notes).slice(0, 1000);
      patch.notes = notes;
    }
  }

  if (Object.keys(patch).length === 0) return { error: "لا يوجد أي تغيير في الطلب." };
  return { patch };
}

/** CSV export for the dashboard (Excel-friendly, UTF-8 BOM written by caller). */
export function toCsv(rows: AdminLinkRow[]): string {
  const header = [
    "id",
    "name",
    "url",
    "link_status",
    "last_verified",
    "is_hidden",
    "category_system",
    "category_task",
    "language",
    "http_status",
    "final_url",
    "error",
    "checked_at",
  ];
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = rows.map((row) =>
    [
      row.id,
      row.name,
      row.url,
      row.link_status,
      row.last_verified,
      row.is_hidden,
      row.category_system,
      row.category_task,
      row.language,
      row.latest?.status_code,
      row.latest?.final_url,
      row.latest?.error,
      row.latest?.checked_at,
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}
