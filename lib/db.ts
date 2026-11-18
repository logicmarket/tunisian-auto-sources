/**
 * File: lib/db.ts
 * Purpose: Single Prisma Client for PostgreSQL (Neon) with serverless-safe
 * pooling, three-attempt retry for transient connection failures, and Arabic
 * error messages.
 *
 * Replaces the Phase 1–4 better-sqlite3 connection. The old synchronous
 * `getDatabase()` API is gone on purpose: every caller must now `await` the
 * Prisma queries, which is why the data-access modules were rewritten.
 *
 * Serverless notes
 * • Vercel functions are ephemeral. Prisma Client is cached on `globalThis` so
 *   hot reloads and reused lambda instances do not open a new pool per request.
 * • Use Neon's **pooled** connection string (host contains `-pooler`) for
 *   `DATABASE_URL`. The unpooled string belongs in `DIRECT_URL` and is used
 *   only by Prisma Migrate / the SQLite importer.
 * • If you use Prisma Accelerate, set `PRISMA_ACCELERATE_URL`; the client will
 *   use it instead of `DATABASE_URL`. No other code change is required.
 */

import { Prisma, PrismaClient } from "@prisma/client";

export const DATABASE_UNAVAILABLE_CODE = "DATABASE_UNAVAILABLE";

/** User-facing Arabic message used by every API route on DB failure. */
export const DATABASE_ERROR_MESSAGE =
  "خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى بعد لحظات.";

export const DATABASE_NOT_CONFIGURED_MESSAGE =
  "قاعدة البيانات غير مهيأة. تحقق من المتغير DATABASE_URL في إعدادات البيئة.";

/**
 * Thrown when PostgreSQL cannot be reached after the retry budget is spent.
 * API routes translate this into HTTP 503 + an Arabic message.
 */
export class DatabaseConnectionError extends Error {
  readonly code = DATABASE_UNAVAILABLE_CODE;
  readonly status = 503;

  constructor(cause?: unknown) {
    super(DATABASE_ERROR_MESSAGE);
    this.name = "DatabaseConnectionError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export function isDatabaseConnectionError(
  error: unknown,
): error is DatabaseConnectionError {
  return error instanceof DatabaseConnectionError;
}

const RETRYABLE_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operation timed out
  "P1017", // Server closed the connection
  "P2024", // Timed out fetching a connection from the pool
  "P2028", // Transaction API error (connection dropped mid-transaction)
  "P2034", // Transaction conflict / deadlock — safe to retry
]);

const RETRYABLE_MESSAGE =
  /(can'?t reach database|connection (?:terminated|closed|refused|reset)|server has closed the connection|timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up)/i;

function isRetryable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_PRISMA_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return RETRYABLE_MESSAGE.test(error.message);
  }
  if (error instanceof Error) {
    return RETRYABLE_MESSAGE.test(error.message);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  attempts?: number;
  label?: string;
  /** Base delay; attempt N waits baseDelayMs * 2^(N-1). */
  baseDelayMs?: number;
}

/**
 * Runs a database operation with exponential backoff (3 attempts by default).
 * Non-transient errors (unique violations, validation, FK errors) are rethrown
 * immediately so routes can return 400/409 instead of a misleading 503.
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === attempts) break;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[db] ${options.label ?? "query"} failed (attempt ${attempt}/${attempts}); ` +
          `retrying in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );
      await sleep(delay);
    }
  }

  if (isRetryable(lastError)) {
    console.error("[db] PostgreSQL unreachable after retries:", lastError);
    throw new DatabaseConnectionError(lastError);
  }

  throw lastError;
}

function resolveDatasourceUrl(): string {
  const accelerate = process.env.PRISMA_ACCELERATE_URL?.trim();
  if (accelerate) return accelerate;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseConnectionError(
      new Error("DATABASE_URL is not set. See docs/env-variables.md."),
    );
  }
  return url;
}

function createBaseClient(): PrismaClient {
  const url = resolveDatasourceUrl();

  return new PrismaClient({
    datasources: { db: { url } },
    log:
      process.env.PRISMA_LOG === "1"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    errorFormat: "minimal",
  });
}

function createClient(): PrismaClient {
  const base = createBaseClient();

  // Centralised retry for model operations. Raw queries in lib/queries.ts and
  // lib/phase4/diagnosis.ts additionally use withDatabaseRetry().
  const extended = base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        return withDatabaseRetry(() => query(args), {
          label: `${model ?? "raw"}.${operation}`,
        });
      },
    },
  });

  return extended as unknown as PrismaClient;
}

declare global {
  // eslint-disable-next-line no-var
  var __tasPrisma: PrismaClient | undefined;
}

/**
 * Returns the process-wide Prisma Client. Kept lazy so `next build` can import
 * server modules without an env var, and so a missing DATABASE_URL produces a
 * clean Arabic error at request time instead of a build crash.
 */
export function getPrisma(): PrismaClient {
  if (!globalThis.__tasPrisma) {
    globalThis.__tasPrisma = createClient();
  }
  return globalThis.__tasPrisma;
}

/**
 * Lazy proxy that behaves exactly like a PrismaClient. Usage stays familiar:
 *   `await prisma.source.findMany()`
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Lightweight dress check used by `/api/health` style routes and scripts. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await withDatabaseRetry(
      () => getPrisma().$queryRaw`SELECT 1`,
      { label: "connection-check" },
    );
    return true;
  } catch (error) {
    if (isDatabaseConnectionError(error)) throw error;
    throw new DatabaseConnectionError(error);
  }
}

/** CLI scripts call this so Node can exit cleanly. */
export async function closeDatabase(): Promise<void> {
  if (!globalThis.__tasPrisma) return;
  await globalThis.__tasPrisma.$disconnect();
  globalThis.__tasPrisma = undefined;
}

/**
 * Advances a PostgreSQL identity sequence after rows were inserted with
 * explicit ids (SQLite import). Without this, the next INSERT collides with
 * id 1. Table names are a closed union — never pass user input.
 */
export type IdentityTable =
  | "sources"
  | "obd_codes"
  | "symptom_mapping"
  | "ratings"
  | "submissions"
  | "source_feedback"
  | "contact_messages"
  | "notifications";

const IDENTITY_TABLES: ReadonlySet<IdentityTable> = new Set([
  "sources",
  "obd_codes",
  "symptom_mapping",
  "ratings",
  "submissions",
  "source_feedback",
  "contact_messages",
  "notifications",
]);

export async function syncIdentitySequence(table: IdentityTable): Promise<void> {
  if (!IDENTITY_TABLES.has(table)) {
    throw new Error(`Refusing to sync an unknown sequence for table "${table}".`);
  }

  await getPrisma().$queryRawUnsafe(
    `SELECT setval(
       pg_get_serial_sequence('"${table}"', 'id'),
       GREATEST(COALESCE((SELECT MAX(id) FROM "${table}"), 1), 1),
       COALESCE((SELECT MAX(id) FROM "${table}"), 0) > 0
     )`,
  );
}

export { Prisma };
