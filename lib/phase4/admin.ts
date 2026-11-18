/**
 * File: lib/phase4/admin.ts
 * Purpose: Minimal, account-free admin gate for the submission review
 * dashboard. The token comes from ADMIN_TOKEN; in development only, a
 * documented fallback (`dev-admin`) is accepted so the workflow can be tested.
 */

import { timingSafeEqual } from "node:crypto";

export const DEV_ADMIN_TOKEN = "dev-admin";

export function getAdminToken(): string | null {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return DEV_ADMIN_TOKEN;
  return null;
}

export function isAdminConfigured(): boolean {
  return getAdminToken() !== null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isAdminAuthorized(headers: Headers): boolean {
  const expected = getAdminToken();
  if (!expected) return false;

  const headerToken = headers.get("x-admin-token")?.trim();
  if (headerToken && safeEqual(headerToken, expected)) return true;

  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  if (match) {
    try {
      return safeEqual(decodeURIComponent(match[1]), expected);
    } catch {
      return false;
    }
  }

  return false;
}
