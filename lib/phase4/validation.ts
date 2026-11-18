/**
 * File: lib/phase4/validation.ts
 * Purpose: Dependency-free validation, URL normalisation, slug generation and
 * blocklist checks shared by the contribute form, API and admin review.
 */

import { SYSTEM_META, TASK_META } from "@/lib/catalog";
import { normalizeSearchText } from "@/lib/utils";
import type { ContributeInput } from "@/lib/types";

export const LIMITS = {
  nameMin: 3,
  nameMax: 50,
  descriptionMin: 20,
  descriptionMax: 200,
  reasonMax: 500,
  emailMax: 120,
} as const;

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "yclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

const SPAM_TERMS = [
  "casino",
  "gambling",
  "betting",
  "poker",
  "viagra",
  "cialis",
  "porn",
  "adult",
  "xxx",
  "escort",
  "payday loan",
  "crypto giveaway",
  "كازينو",
  "قمار",
  "مراهنات",
  "إباحي",
  "اباحي",
  "فياجرا",
];

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return false;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Canonical form used for duplicate detection. Host is lowercased, default
 * ports and tracking parameters are removed, and the trailing slash is
 * dropped so `https://site.com/` and `https://site.com` match.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (
      (parsed.protocol === "https:" && parsed.port === "443") ||
      (parsed.protocol === "http:" && parsed.port === "80")
    ) {
      parsed.port = "";
    }

    const kept = new URLSearchParams();
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) kept.append(key, value);
    }
    kept.sort();
    parsed.search = kept.toString();

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed.toLowerCase();
  }
}

export function isValidEmail(value: string): boolean {
  if (value.length > LIMITS.emailMax) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function findSpamTerms(input: ContributeInput): string[] {
  const haystack = normalizeSearchText(
    [input.url, input.name, input.description_ar, input.reason ?? ""]
      .filter(Boolean)
      .join(" "),
  );
  return SPAM_TERMS.filter((term) =>
    haystack.includes(normalizeSearchText(term)),
  );
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateContribution(input: ContributeInput): ValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name?.trim() ?? "";
  const description = input.description_ar?.trim() ?? "";
  const url = input.url?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const reason = input.reason?.trim() ?? "";

  if (!url) {
    errors.url = "الرابط مطلوب.";
  } else if (!isValidHttpUrl(url)) {
    errors.url = "أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://";
  }

  if (!name) {
    errors.name = "اسم الموقع مطلوب.";
  } else if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    errors.name = `اسم الموقع يجب أن يكون بين ${LIMITS.nameMin} و${LIMITS.nameMax} حرفاً.`;
  }

  if (!description) {
    errors.description_ar = "الوصف بالعربي مطلوب.";
  } else if (
    description.length < LIMITS.descriptionMin ||
    description.length > LIMITS.descriptionMax
  ) {
    errors.description_ar = `الوصف يجب أن يكون بين ${LIMITS.descriptionMin} و${LIMITS.descriptionMax} حرفاً.`;
  }

  const systemValues = new Set(SYSTEM_META.map((system) => system.value));
  if (!input.suggested_system) {
    errors.suggested_system = "اختر النظام المقترح.";
  } else if (!systemValues.has(input.suggested_system)) {
    errors.suggested_system = "النظام المختار غير معروف.";
  }

  const taskValues = new Set(TASK_META.map((task) => task.value));
  if (!input.suggested_task) {
    errors.suggested_task = "اختر المهمة المقترحة.";
  } else if (!taskValues.has(input.suggested_task)) {
    errors.suggested_task = "المهمة المختارة غير معروفة.";
  }

  if (email && !isValidEmail(email)) {
    errors.email = "صيغة البريد الإلكتروني غير صحيحة.";
  }

  if (reason.length > LIMITS.reasonMax) {
    errors.reason = `سبب الاقتراح يجب ألا يتجاوز ${LIMITS.reasonMax} حرفاً.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Arabic-friendly slug; falls back to a timestamp when the name is unusable. */
export function slugify(value: string): string {
  const normalized = normalizeSearchText(value)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || `source-${Date.now().toString(36)}`;
}

export function trackingId(id: number, createdAt?: string | null): string {
  const year = createdAt
    ? new Date(createdAt).getFullYear()
    : new Date().getFullYear();
  return `SUB-${year}-${String(id).padStart(6, "0")}`;
}
