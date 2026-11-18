import { NextRequest, NextResponse } from "next/server";

/**
 * File: app/sentry-tunnel/route.ts
 * Purpose: Manual Sentry tunnel. Forwards browser envelopes from our own
 * origin to the Sentry ingest host, which keeps error reporting working when
 * an ad blocker blocks `*.ingest.sentry.io`.
 *
 * Dormant by design: without a DSN the endpoint answers 404, so it is not an
 * open proxy. The target host and project id are derived from the DSN itself —
 * never hard-coded — so the same file works for any Sentry organisation.
 *
 * To route the browser SDK through this endpoint, either set
 * `tunnelRoute: "/sentry-tunnel"` in `withSentryConfig` or pass
 * `tunnel: "/sentry-tunnel"` to `Sentry.init` in `sentry.client.config.ts`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envelopes larger than this are rejected instead of buffered. */
const MAX_ENVELOPE_BYTES = 1_000_000;

type TunnelTarget = {
  host: string;
  projectId: string;
};

function resolveTarget(dsn: string | undefined): TunnelTarget | null {
  if (!dsn) {
    return null;
  }

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");

    if (!url.host || !projectId) {
      return null;
    }

    return { host: url.host, projectId };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  const target = resolveTarget(dsn);

  if (!target) {
    return new NextResponse(null, { status: 404 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_ENVELOPE_BYTES) {
    return NextResponse.json({ error: "Envelope too large" }, { status: 413 });
  }

  const envelope = await request.text();
  if (!envelope || envelope.length > MAX_ENVELOPE_BYTES) {
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://${target.host}/api/${target.projectId}/envelope/`,
      {
        method: "POST",
        body: envelope,
        headers: {
          "Content-Type": "application/x-sentry-envelope",
        },
        cache: "no-store",
      },
    );

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tunnel failed" }, { status: 502 });
  }
}
