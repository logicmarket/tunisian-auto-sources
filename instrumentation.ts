import * as Sentry from "@sentry/nextjs";

/**
 * File: instrumentation.ts
 * Purpose: Next.js instrumentation hook (stable in 14.2). Loads the correct
 * Sentry runtime configuration and forwards server-side render errors.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
