import * as Sentry from "@sentry/nextjs";

/**
 * File: sentry.edge.config.ts
 * Purpose: Edge runtime monitoring (middleware / edge routes). Disabled when
 * no DSN is present.
 */

const dsn =
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  environment: process.env.NODE_ENV,
});
