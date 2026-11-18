import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// `@sentry/nextjs/config` is CommonJS; Next loads this config as native ESM.
const { withSentryConfig } = require("@sentry/nextjs/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    // Serve modern formats when the browser supports them.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    // Prisma Client and better-sqlite3 are native Node.js modules; keep them
    // out of the bundler. better-sqlite3 is used only by the one-off
    // SQLite → PostgreSQL migration script.
    serverComponentsExternalPackages: ["@prisma/client", "better-sqlite3"],
    // Required on Next 14.2 to load instrumentation.ts (Sentry server hooks).
    instrumentationHook: true,
    // Ensure seed JSON files are available when tracing a standalone build.
    outputFileTracingIncludes: {
      "/*": ["./data/**/*"],
      "/api/**/*": ["./data/**/*"],
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Crawlers rarely need a fresher sitemap than once a day.
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // Generated social card: immutable, cache for one year.
        source: "/og-image.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

const sentryConfig = {
  // Source-map upload is opt-in: set SENTRY_AUTH_TOKEN, SENTRY_ORG and
  // SENTRY_PROJECT in the deployment environment to enable it.
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  disableLogger: true,
  telemetry: false,
};

export default withSentryConfig(nextConfig, sentryConfig);
