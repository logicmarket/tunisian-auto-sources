/**
 * File: lib/api-error.ts
 * Purpose: One place that turns Prisma/PostgreSQL failures into safe, Arabic
 * JSON responses. Raw Prisma errors are never leaked to the browser.
 */

import { Prisma } from "@prisma/client";
import { DATABASE_ERROR_MESSAGE, isDatabaseConnectionError } from "./db";

export interface ApiFailure {
  error: string;
  code?: string;
  status: number;
}

/**
 * @param error   the caught error
 * @param fallback route-specific Arabic message (used for non-DB errors)
 * @param status  fallback HTTP status (default 500)
 */
export function toApiFailure(
  error: unknown,
  fallback: string,
  status = 500,
): ApiFailure {
  if (isDatabaseConnectionError(error)) {
    return {
      error: DATABASE_ERROR_MESSAGE,
      code: "DATABASE_UNAVAILABLE",
      status: 503,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        error: "هذا السجل موجود مسبقاً.",
        code: "CONFLICT",
        status: 409,
      };
    }
    if (error.code === "P2025") {
      return {
        error: "السجل المطلوب غير موجود.",
        code: "NOT_FOUND",
        status: 404,
      };
    }
    if (error.code === "P2003") {
      return {
        error: "لا يمكن تنفيذ العملية بسبب ارتباط البيانات بسجلات أخرى.",
        code: "FOREIGN_KEY_CONSTRAINT",
        status: 409,
      };
    }
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Error &&
      /DATABASE_URL|database url|prisma client/i.test(error.message))
  ) {
    return {
      error: DATABASE_ERROR_MESSAGE,
      code: "DATABASE_UNAVAILABLE",
      status: 503,
    };
  }

  return { error: fallback, status };
}
