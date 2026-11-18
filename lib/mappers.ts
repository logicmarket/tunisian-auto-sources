/**
 * File: lib/mappers.ts
 * Purpose: Convert Prisma rows (Date, camel-ish client objects) into the
 * snake_case record shapes that the React server components and API JSON
 * already consume. Keeping this boundary means zero UI refactors during the
 * SQLite → PostgreSQL move.
 */

import type {
  ContactMessage,
  Notification,
  ObdCode,
  Rating,
  Source,
  SourceFeedback,
  Submission,
  Symptom,
} from "@prisma/client";
import type {
  ObdCodeRecord,
  SourceRecord,
  SubmissionRecord,
  SymptomRecord,
} from "./types";

/** Prisma Date → ISO-8601 string. SQLite callers expect a string. */
export function toIso(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

export function toSourceRecord(row: Source): SourceRecord {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description_ar: row.description_ar,
    description_fr: row.description_fr,
    category_system: row.category_system,
    category_task: row.category_task,
    language: row.language,
    link_status: row.link_status,
    last_verified: row.last_verified,
    rating: row.rating,
    notes: row.notes,
    slug: row.slug,
    submission_id: row.submission_id,
    created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date(0).toISOString(),
  };
}

export function toObdCodeRecord(row: ObdCode): ObdCodeRecord {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    system_category: row.system_category,
    related_system: row.related_system,
    name_ar: row.name_ar,
    name_en: row.name_en,
    description: row.description,
    causes: row.causes,
    diagnosis_steps: row.diagnosis_steps,
    severity: row.severity,
    verification: row.verification,
    source_note: row.source_note,
    family: row.family,
  };
}

export function toSubmissionRecord(row: Submission): SubmissionRecord {
  return {
    id: row.id,
    url: row.url,
    normalized_url: row.normalized_url,
    name: row.name,
    description_ar: row.description_ar,
    suggested_system: row.suggested_system,
    suggested_task: row.suggested_task,
    reason: row.reason,
    email: row.email,
    status: row.status as SubmissionRecord["status"],
    reviewer_note: row.reviewer_note,
    status_token: row.status_token,
    recaptcha_score: row.recaptcha_score,
    spam_flags: row.spam_flags,
    ip_address: row.ip_address,
    published_source_id: row.published_source_id,
    created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
    reviewed_at: toIso(row.reviewed_at),
  };
}

export function toSymptomRecord(row: Symptom): SymptomRecord {
  return {
    id: row.id,
    name_ar: row.name_ar,
    name_en: row.name_en,
    system_category: row.system_category as SymptomRecord["system_category"],
    sort_order: row.sort_order,
  };
}

/** Only the fields the ratings module needs from a row. */
export interface RatingRowView {
  id: number;
  source_id: number;
  visitor_id: string;
  stars: number;
  comment: string | null;
  helpful: number | null;
  flagged: number;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function toRatingRowView(row: Rating): RatingRowView {
  return {
    id: row.id,
    source_id: row.source_id,
    visitor_id: row.visitor_id,
    stars: row.stars,
    comment: row.comment,
    helpful: row.helpful,
    flagged: row.flagged,
    flag_reason: row.flag_reason,
    created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date(0).toISOString(),
  };
}

export type { ContactMessage, Notification, SourceFeedback };
