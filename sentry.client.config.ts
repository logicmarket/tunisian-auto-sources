import * as Sentry from "@sentry/nextjs";

/**
 * File: sentry.client.config.ts
 * Purpose: Browser error monitoring. Initialises only when SENTRY_DSN is
 * configured; otherwise the SDK stays inert (safe for local development and
 * preview deployments without a DSN).
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
