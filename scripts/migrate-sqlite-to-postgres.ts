/**
 * File: scripts/migrate-sqlite-to-postgres.ts
 * Purpose: Copy every row from the legacy better-sqlite3 database into Neon
 * PostgreSQL through Prisma, then prove that nothing was lost.
 *
 * Usage
 *   npm run db:migrate:sqlite -- --dry-run
 *   npm run db:migrate:sqlite
 *   npm run db:migrate:sqlite -- --verify-only
 *   npm run db:migrate:sqlite -- --rollback --force
 *
 * Guarantees
 * • Additive: uses createMany({ skipDuplicates: true }); never drops rows
 *   unless you explicitly pass --rollback.
 * • All-or-nothing: every table is written inside one interactive transaction.
 * • Validated: per-table source count, migrated count, target count and a full
 *   missing-id check. A JSON + Markdown report is written to migration-reports/.
 * • Non-destructive on failure: any transformation error aborts the run unless
 *   --skip-invalid is supplied; skipped rows are always listed in the report.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import {
  closeDatabase,
  prisma,
  syncIdentitySequence,
  type IdentityTable,
} from "../lib/db";

// Load Next.js environment files for CLI usage (dotenv is a devDependency).
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

interface Options {
  sqlitePath: string;
  dryRun: boolean;
  verifyOnly: boolean;
  rollback: boolean;
  force: boolean;
  skipInvalid: boolean;
  reportDir: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sqlitePath:
      process.env.SQLITE_DATABASE_PATH?.trim() ||
      path.join("data", "car-sources.db"),
    dryRun: false,
    verifyOnly: false,
    rollback: false,
    force: false,
    skipInvalid: false,
    reportDir: process.env.MIGRATION_REPORT_DIR?.trim() || "migration-reports",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sqlite") options.sqlitePath = argv[++index] ?? options.sqlitePath;
    else if (arg.startsWith("--sqlite=")) options.sqlitePath = arg.slice(9);
    else if (arg === "--report-dir") options.reportDir = argv[++index] ?? options.reportDir;
    else if (arg.startsWith("--report-dir=")) options.reportDir = arg.slice(13);
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--verify-only") options.verifyOnly = true;
    else if (arg === "--rollback") options.rollback = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--skip-invalid") options.skipInvalid = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!path.isAbsolute(options.sqlitePath)) {
    options.sqlitePath = path.resolve(process.cwd(), options.sqlitePath);
  }
  return options;
}

function printHelp(): void {
  console.log(`
SQLite → PostgreSQL migration

  --sqlite <path>     SQLite file (default: data/car-sources.db
                      or $SQLITE_DATABASE_PATH)
  --dry-run           Read + transform + validate, write nothing
  --verify-only       Compare SQLite and PostgreSQL counts/ids only
  --rollback --force  TRUNCATE migrated tables (destructive, guarded)
  --skip-invalid      Skip bad rows instead of aborting; report them
  --report-dir <dir>  Report directory (default: migration-reports/)

Environment:
  DATABASE_URL        PostgreSQL/Neon pooled or direct connection string
  DIRECT_URL          Direct connection (Prisma Migrate only)
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
}

function requiredText(value: unknown, field: string, issues: string[], rowId: string): string {
  const result = text(value);
  if (result === null) {
    issues.push(`${rowId}: required field "${field}" is empty`);
    return "";
  }
  return result;
}

function integer(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function integerOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
}

function real(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function realOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const SQLITE_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

/**
 * SQLite stored `CURRENT_TIMESTAMP` as "YYYY-MM-DD HH:MM:SS" in UTC.
 * PostgreSQL timestamptz needs an explicit zone, so append "Z".
 */
function toDate(value: unknown, field: string, issues: string[], rowId: string): Date | null {
  if (value === null || value === undefined || value === "") return null;

  let parsed: Date;
  if (value instanceof Date) {
    parsed = value;
  } else if (typeof value === "number") {
    parsed = new Date(value);
  } else {
    const raw = String(value).trim();
    if (SQLITE_TIMESTAMP.test(raw)) {
      parsed = new Date(`${raw.replace(" ", "T")}Z`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      parsed = new Date(`${raw}T00:00:00Z`);
    } else {
      parsed = new Date(raw);
    }
  }

  if (Number.isNaN(parsed.getTime())) {
    issues.push(`${rowId}: invalid ${field} "${String(value)}"`);
    return null;
  }
  return parsed;
}

function jsonText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepared dataset
// ─────────────────────────────────────────────────────────────────────────────

interface IssueRecord {
  table: string;
  rowId: string;
  reason: string;
  /** Warnings are automatic repairs and do not abort the run. */
  severity: "error" | "warning";
}

interface PreparedData {
  sources: Prisma.SourceCreateManyInput[];
  obd_codes: Prisma.ObdCodeCreateManyInput[];
  symptoms: Prisma.SymptomCreateManyInput[];
  symptom_mapping: Prisma.SymptomMappingCreateManyInput[];
  ratings: Prisma.RatingCreateManyInput[];
  submissions: Prisma.SubmissionCreateManyInput[];
  source_feedback: Prisma.SourceFeedbackCreateManyInput[];
  contact_messages: Prisma.ContactMessageCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
}

interface TableSpec {
  table: keyof PreparedData & string;
  key: "id" | "code";
  identity: boolean;
  /** Core tables must exist in the SQLite file; optional ones may be absent. */
  required: boolean;
}

const TABLE_SPECS: TableSpec[] = [
  { table: "sources", key: "id", identity: true, required: true },
  { table: "obd_codes", key: "id", identity: true, required: true },
  { table: "symptoms", key: "id", identity: false, required: true },
  { table: "symptom_mapping", key: "id", identity: true, required: true },
  { table: "ratings", key: "id", identity: true, required: false },
  { table: "submissions", key: "id", identity: true, required: false },
  { table: "source_feedback", key: "id", identity: true, required: false },
  { table: "contact_messages", key: "id", identity: true, required: false },
  { table: "notifications", key: "id", identity: true, required: false },
];

type Row = Record<string, unknown>;

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function readTable(db: Database.Database, table: string): Row[] {
  if (!tableExists(db, table)) return [];
  return db.prepare(`SELECT * FROM "${table}"`).all() as Row[];
}

function prepareData(db: Database.Database, skipInvalid: boolean): {
  prepared: PreparedData;
  issues: IssueRecord[];
  sourceCounts: Record<string, number>;
} {
  const issues: IssueRecord[] = [];
  const sourceCounts: Record<string, number> = {};

  const report = (
    table: string,
    rowId: string,
    reason: string,
    severity: IssueRecord["severity"] = "error",
  ) => {
    issues.push({ table, rowId, reason, severity });
  };

  const prepared: PreparedData = {
    sources: [],
    obd_codes: [],
    symptoms: [],
    symptom_mapping: [],
    ratings: [],
    submissions: [],
    source_feedback: [],
    contact_messages: [],
    notifications: [],
  };

  // ── sources ────────────────────────────────────────────────────────────────
  const sourceRows = readTable(db, "sources");
  sourceCounts.sources = sourceRows.length;
  const seenUrls = new Set<string>();
  const seenSlugs = new Set<string>();
  const sourceIds = new Set<number>();

  for (const row of sourceRows) {
    const rowId = `sources#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const id = integer(row.id);
    const url = requiredText(row.url, "url", localIssues, rowId);
    // Validate required columns before the skip gate so `--dry-run` reports
    // every blank field instead of silently substituting a fallback.
    const name = requiredText(row.name, "name", localIssues, rowId);
    const descriptionAr = requiredText(
      row.description_ar,
      "description_ar",
      localIssues,
      rowId,
    );
    const categorySystem = requiredText(
      row.category_system,
      "category_system",
      localIssues,
      rowId,
    );
    const categoryTask = requiredText(
      row.category_task,
      "category_task",
      localIssues,
      rowId,
    );
    const language = requiredText(row.language, "language", localIssues, rowId);

    if (url && seenUrls.has(url)) {
      localIssues.push(`${rowId}: duplicate url "${url}" (source has a UNIQUE url)`);
    }
    const slugRaw = text(row.slug);
    let slug = slugRaw;
    if (slug && seenSlugs.has(slug)) {
      localIssues.push(`${rowId}: duplicate slug "${slug}" — stored as NULL`);
      slug = null;
    }
    if (id <= 0) {
      localIssues.push(`${rowId}: missing id`);
    }

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("sources", rowId, reason);
      if (!skipInvalid) continue;
    }

    if (!url || id <= 0) continue;

    seenUrls.add(url);
    if (slug) seenSlugs.add(slug);
    sourceIds.add(id);

    prepared.sources.push({
      id,
      name: name || `Source ${id}`,
      url,
      description_ar: descriptionAr || "—",
      description_fr: text(row.description_fr),
      category_system: categorySystem || "General / Multi-system",
      category_task: categoryTask || "Reference / Learning",
      language: language || "Unknown",
      link_status: text(row.link_status) ?? "UNVERIFIED",
      last_verified: text(row.last_verified),
      rating: real(row.rating, 0),
      notes: text(row.notes),
      slug,
      submission_id: integerOrNull(row.submission_id),
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
      updated_at: toDate(row.updated_at, "updated_at", localIssues, rowId) ?? undefined,
    });
  }

  // ── obd_codes ──────────────────────────────────────────────────────────────
  const obdRows = readTable(db, "obd_codes");
  sourceCounts.obd_codes = obdRows.length;
  const seenCodes = new Set<string>();
  const codeValues = new Set<string>();

  for (const row of obdRows) {
    const rowId = `obd_codes#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const code = text(row.code)?.toUpperCase() ?? "";
    if (!code) localIssues.push(`${rowId}: empty code`);
    else if (seenCodes.has(code)) localIssues.push(`${rowId}: duplicate code "${code}"`);

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("obd_codes", rowId, reason);
      if (!skipInvalid) continue;
    }
    if (!code) continue;

    seenCodes.add(code);
    codeValues.add(code);
    const id = integer(row.id);
    if (id <= 0) {
      report("obd_codes", rowId, "missing id — row skipped");
      continue;
    }

    prepared.obd_codes.push({
      id,
      code,
      category:
        requiredText(row.category, "category", localIssues, rowId) || "General",
      system_category: text(row.system_category),
      related_system: text(row.related_system),
      name_ar: text(row.name_ar),
      name_en: text(row.name_en),
      description: text(row.description),
      causes: text(row.causes),
      diagnosis_steps: text(row.diagnosis_steps),
      severity: text(row.severity) ?? "Medium",
      verification: text(row.verification) ?? "VERIFIED",
      source_note: text(row.source_note),
      family: text(row.family),
    });
  }

  // ── symptoms ───────────────────────────────────────────────────────────────
  const symptomRows = readTable(db, "symptoms");
  sourceCounts.symptoms = symptomRows.length;
  const symptomIds = new Set<string>();

  for (const row of symptomRows) {
    const rowId = `symptoms#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const id = text(row.id) ?? "";
    if (!id) localIssues.push(`${rowId}: empty id`);
    const nameAr = requiredText(row.name_ar, "name_ar", localIssues, rowId);
    const nameEn = requiredText(row.name_en, "name_en", localIssues, rowId);
    const systemCategory = requiredText(
      row.system_category,
      "system_category",
      localIssues,
      rowId,
    );

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("symptoms", rowId, reason);
      if (!skipInvalid) continue;
    }
    if (!id) continue;

    symptomIds.add(id);
    prepared.symptoms.push({
      id,
      name_ar: nameAr || id,
      name_en: nameEn || id,
      system_category: systemCategory || "engine",
      sort_order: integer(row.sort_order),
    });
  }

  // ── symptom_mapping ────────────────────────────────────────────────────────
  const mappingRows = readTable(db, "symptom_mapping");
  sourceCounts.symptom_mapping = mappingRows.length;
  const seenMappings = new Set<string>();

  for (const row of mappingRows) {
    const rowId = `symptom_mapping#${String(row.id ?? "?")}`;
    const symptomId = text(row.symptom_id) ?? "";
    const obdCode = text(row.obd_code)?.toUpperCase() ?? "";
    const localIssues: string[] = [];

    if (!symptomId) localIssues.push(`${rowId}: missing symptom_id`);
    else if (!symptomIds.has(symptomId)) {
      localIssues.push(`${rowId}: unknown symptom_id "${symptomId}"`);
    }
    if (!obdCode) localIssues.push(`${rowId}: missing obd_code`);
    else if (!codeValues.has(obdCode)) {
      localIssues.push(`${rowId}: unknown obd_code "${obdCode}"`);
    }
    const pairKey = `${symptomId}::${obdCode}`;
    if (seenMappings.has(pairKey)) {
      localIssues.push(`${rowId}: duplicate (symptom_id, obd_code)`);
    }

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("symptom_mapping", rowId, reason);
      if (!skipInvalid) continue;
    }
    if (!symptomId || !obdCode) continue;

    seenMappings.add(pairKey);
    const mappingId = integer(row.id);
    if (mappingId <= 0) {
      report("symptom_mapping", rowId, "missing id — row skipped");
      continue;
    }
    prepared.symptom_mapping.push({
      id: mappingId,
      symptom_id: symptomId,
      obd_code: obdCode,
      confidence: text(row.confidence) ?? "low",
      common_brands: jsonText(row.common_brands) ?? "[]",
      priority_rank: integer(row.priority_rank),
      rationale_ar: text(row.rationale_ar),
      verification: text(row.verification) ?? "APPROXIMATE",
    });
  }

  // ── ratings ────────────────────────────────────────────────────────────────
  const ratingRows = readTable(db, "ratings");
  sourceCounts.ratings = ratingRows.length;
  const seenRatingPairs = new Set<string>();

  for (const row of ratingRows) {
    const rowId = `ratings#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const sourceId = integer(row.source_id);
    const visitorId = text(row.visitor_id) ?? "";
    const stars = integer(row.stars);
    const pairKey = `${sourceId}::${visitorId}`;

    if (!sourceIds.has(sourceId)) localIssues.push(`${rowId}: unknown source_id ${sourceId}`);
    if (!visitorId) localIssues.push(`${rowId}: empty visitor_id`);
    if (stars < 1 || stars > 5) localIssues.push(`${rowId}: stars ${stars} outside 1..5`);
    if (seenRatingPairs.has(pairKey)) {
      localIssues.push(`${rowId}: duplicate (source_id, visitor_id)`);
    }

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("ratings", rowId, reason);
      if (!skipInvalid) continue;
    }
    if (!sourceIds.has(sourceId) || !visitorId) continue;

    seenRatingPairs.add(pairKey);
    const ratingId = integer(row.id);
    if (ratingId <= 0) {
      report("ratings", rowId, "missing id — row skipped");
      continue;
    }
    prepared.ratings.push({
      id: ratingId,
      source_id: sourceId,
      visitor_id: visitorId,
      stars: Math.min(5, Math.max(1, stars)),
      comment: text(row.comment),
      helpful: integerOrNull(row.helpful),
      flagged: integer(row.flagged),
      flag_reason: text(row.flag_reason),
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
      updated_at: toDate(row.updated_at, "updated_at", localIssues, rowId) ?? undefined,
    });
  }

  // ── submissions ────────────────────────────────────────────────────────────
  const submissionRows = readTable(db, "submissions");
  sourceCounts.submissions = submissionRows.length;
  const seenTokens = new Set<string>();

  for (const row of submissionRows) {
    const rowId = `submissions#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const id = integer(row.id);
    const url = requiredText(row.url, "url", localIssues, rowId);
    const name = requiredText(row.name, "name", localIssues, rowId);
    const descriptionAr = requiredText(
      row.description_ar,
      "description_ar",
      localIssues,
      rowId,
    );
    const suggestedSystem = requiredText(
      row.suggested_system,
      "suggested_system",
      localIssues,
      rowId,
    );
    const suggestedTask = requiredText(
      row.suggested_task,
      "suggested_task",
      localIssues,
      rowId,
    );

    let token = text(row.status_token) ?? "";
    if (!token) {
      token = `legacy-${id.toString(16)}`;
      report(
        "submissions",
        rowId,
        `missing status_token — generated "${token}"`,
        "warning",
      );
    }
    if (seenTokens.has(token)) {
      localIssues.push(`${rowId}: duplicate status_token "${token}"`);
    }
    if (id <= 0) {
      localIssues.push(`${rowId}: missing id`);
    }

    if (localIssues.length > 0) {
      for (const reason of localIssues) report("submissions", rowId, reason);
      if (!skipInvalid) continue;
    }
    if (id <= 0 || !url) continue;
    seenTokens.add(token);

    const publishedSourceId = integerOrNull(row.published_source_id);
    const safePublished =
      publishedSourceId !== null && sourceIds.has(publishedSourceId)
        ? publishedSourceId
        : null;
    if (publishedSourceId !== null && safePublished === null) {
      report(
        "submissions",
        rowId,
        `published_source_id ${publishedSourceId} not found — stored as NULL`,
        "warning",
      );
    }

    prepared.submissions.push({
      id,
      url,
      normalized_url: text(row.normalized_url) || url,
      name: name || `Submission ${id}`,
      description_ar: descriptionAr || "—",
      suggested_system: suggestedSystem || "General / Multi-system",
      suggested_task: suggestedTask || "Reference / Learning",
      reason: text(row.reason),
      email: text(row.email),
      status: text(row.status) ?? "pending",
      reviewer_note: text(row.reviewer_note),
      status_token: token,
      recaptcha_score: realOrNull(row.recaptcha_score),
      spam_flags: jsonText(row.spam_flags),
      ip_address: text(row.ip_address),
      published_source_id: safePublished,
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
      reviewed_at: toDate(row.reviewed_at, "reviewed_at", localIssues, rowId) ?? undefined,
    });
  }

  // ── source_feedback ────────────────────────────────────────────────────────
  const feedbackRows = readTable(db, "source_feedback");
  sourceCounts.source_feedback = feedbackRows.length;

  for (const row of feedbackRows) {
    const rowId = `source_feedback#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const sourceId = integer(row.source_id);
    if (!sourceIds.has(sourceId)) {
      report("source_feedback", rowId, `unknown source_id ${sourceId} — row skipped`);
      if (!skipInvalid) continue;
      continue;
    }
    const feedbackId = integer(row.id);
    if (feedbackId <= 0) {
      report("source_feedback", rowId, "missing id — row skipped");
      continue;
    }
    prepared.source_feedback.push({
      id: feedbackId,
      source_id: sourceId,
      kind: text(row.kind) ?? "rating",
      value: integer(row.value),
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
    });
  }

  // ── contact_messages ───────────────────────────────────────────────────────
  const contactRows = readTable(db, "contact_messages");
  sourceCounts.contact_messages = contactRows.length;

  for (const row of contactRows) {
    const rowId = `contact_messages#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const contactId = integer(row.id);
    if (contactId <= 0) {
      report("contact_messages", rowId, "missing id — row skipped");
      continue;
    }
    prepared.contact_messages.push({
      id: contactId,
      name: text(row.name),
      email: text(row.email),
      topic: text(row.topic) ?? "other",
      message: text(row.message) ?? "",
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
    });
  }

  // ── notifications ──────────────────────────────────────────────────────────
  const notificationRows = readTable(db, "notifications");
  sourceCounts.notifications = notificationRows.length;

  for (const row of notificationRows) {
    const rowId = `notifications#${String(row.id ?? "?")}`;
    const localIssues: string[] = [];
    const notificationId = integer(row.id);
    if (notificationId <= 0) {
      report("notifications", rowId, "missing id — row skipped");
      continue;
    }
    prepared.notifications.push({
      id: notificationId,
      channel: text(row.channel) ?? "email",
      recipient: text(row.recipient) ?? "",
      subject: text(row.subject) ?? "",
      body: text(row.body) ?? "",
      status: text(row.status) ?? "queued",
      created_at: toDate(row.created_at, "created_at", localIssues, rowId) ?? undefined,
      sent_at: toDate(row.sent_at, "sent_at", localIssues, rowId) ?? undefined,
    });
  }

  return { prepared, issues, sourceCounts };
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL target helpers
// ─────────────────────────────────────────────────────────────────────────────

async function targetTableInfo(
  table: keyof PreparedData & string,
): Promise<{ count: number; ids: Set<string> }> {
  switch (table) {
    case "sources": {
      const rows = await prisma.source.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "obd_codes": {
      const rows = await prisma.obdCode.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "symptoms": {
      const rows = await prisma.symptom.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => row.id)) };
    }
    case "symptom_mapping": {
      const rows = await prisma.symptomMapping.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "ratings": {
      const rows = await prisma.rating.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "submissions": {
      const rows = await prisma.submission.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "source_feedback": {
      const rows = await prisma.sourceFeedback.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "contact_messages": {
      const rows = await prisma.contactMessage.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    case "notifications": {
      const rows = await prisma.notification.findMany({ select: { id: true } });
      return { count: rows.length, ids: new Set(rows.map((row) => String(row.id))) };
    }
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

function preparedIds(data: PreparedData, table: keyof PreparedData & string): string[] {
  const rows = data[table] as Array<{ id?: number | string; code?: string }>;
  if (table === "symptoms") return rows.map((row) => String(row.id));
  return rows.map((row) => String(row.id));
}

interface TableReport {
  table: string;
  sourceRows: number;
  preparedRows: number;
  targetBefore: number;
  insertedThisRun: number;
  targetAfter: number;
  missingIds: number;
  missingSample: string[];
  status: "PASS" | "WARN" | "FAIL" | "SKIPPED";
}

interface MigrationReport {
  startedAt: string;
  finishedAt: string;
  mode: "dry-run" | "migrate" | "verify-only" | "rollback";
  sqlitePath: string;
  sqliteSha256: string;
  databaseHost: string;
  tables: TableReport[];
  issues: IssueRecord[];
  foreignKeyCheck: Array<Record<string, unknown>>;
  overall: "PASS" | "WARN" | "FAIL";
}

async function writeReport(
  report: MigrationReport,
  reportDir: string,
): Promise<string> {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(reportDir, `migration-${stamp}.json`);
  const mdPath = path.join(reportDir, `migration-${stamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [
    "# SQLite → PostgreSQL migration report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Mode: **${report.mode}**`,
    `- Source: \`${report.sqlitePath}\``,
    `- Source SHA-256: \`${report.sqliteSha256}\``,
    `- Target host: \`${report.databaseHost}\``,
    `- Overall: **${report.overall}**`,
    "",
    "| Table | SQLite rows | Prepared | Target before | Inserted | Target after | Missing ids | Status |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...report.tables.map(
      (table) =>
        `| ${table.table} | ${table.sourceRows} | ${table.preparedRows} | ` +
        `${table.targetBefore} | ${table.insertedThisRun} | ${table.targetAfter} | ` +
        `${table.missingIds} | ${table.status} |`,
    ),
    "",
  ];

  const errors = report.issues.filter((issue) => issue.severity !== "warning");
  const warnings = report.issues.filter((issue) => issue.severity === "warning");

  if (errors.length > 0) {
    lines.push("## Errors / skipped rows", "");
    for (const issue of errors) {
      lines.push(`- \`${issue.table}\` ${issue.rowId}: ${issue.reason}`);
    }
    lines.push("");
  } else {
    lines.push("## Errors / skipped rows", "", "None.", "");
  }

  if (warnings.length > 0) {
    lines.push("## Automatic repairs (warnings)", "");
    for (const issue of warnings) {
      lines.push(`- \`${issue.table}\` ${issue.rowId}: ${issue.reason}`);
    }
    lines.push("");
  }

  if (report.foreignKeyCheck.length > 0) {
    lines.push("## SQLite foreign_key_check", "");
    for (const row of report.foreignKeyCheck) {
      lines.push(`- ${JSON.stringify(row)}`);
    }
    lines.push("");
  }

  fs.writeFileSync(mdPath, lines.join("\n"), "utf8");
  return jsonPath;
}

function databaseHost(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const parsed = new URL(url.replace(/^prisma:\/\//, "https://"));
    return parsed.host;
  } catch {
    return "unknown";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rollback
// ─────────────────────────────────────────────────────────────────────────────

async function rollback(options: Options): Promise<void> {
  if (!options.force) {
    throw new Error(
      "Refusing to roll back without --force. This TRUNCATEs all portal tables.",
    );
  }

  console.warn("[migrate] DESTRUCTIVE ROLLBACK — truncating portal tables…");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "symptom_mapping",
      "ratings",
      "source_feedback",
      "submissions",
      "sources",
      "symptoms",
      "obd_codes",
      "notifications",
      "contact_messages"
    RESTART IDENTITY CASCADE
  `);
  console.log("[migrate] Rollback complete. Re-run without --rollback to import.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert
// ─────────────────────────────────────────────────────────────────────────────

async function insertAll(data: PreparedData): Promise<Record<string, number>> {
  return prisma.$transaction(
    async (tx) => {
      const inserted: Record<string, number> = {};

      inserted.sources = (
        await tx.source.createMany({ data: data.sources, skipDuplicates: true })
      ).count;
      inserted.obd_codes = (
        await tx.obdCode.createMany({ data: data.obd_codes, skipDuplicates: true })
      ).count;
      inserted.symptoms = (
        await tx.symptom.createMany({ data: data.symptoms, skipDuplicates: true })
      ).count;
      inserted.symptom_mapping = (
        await tx.symptomMapping.createMany({
          data: data.symptom_mapping,
          skipDuplicates: true,
        })
      ).count;
      inserted.ratings = (
        await tx.rating.createMany({ data: data.ratings, skipDuplicates: true })
      ).count;
      inserted.submissions = (
        await tx.submission.createMany({
          data: data.submissions,
          skipDuplicates: true,
        })
      ).count;
      inserted.source_feedback = (
        await tx.sourceFeedback.createMany({
          data: data.source_feedback,
          skipDuplicates: true,
        })
      ).count;
      inserted.contact_messages = (
        await tx.contactMessage.createMany({
          data: data.contact_messages,
          skipDuplicates: true,
        })
      ).count;
      inserted.notifications = (
        await tx.notification.createMany({
          data: data.notifications,
          skipDuplicates: true,
        })
      ).count;

      return inserted;
    },
    { timeout: 180_000, maxWait: 20_000 },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. See docs/env-variables.md.");
  }
  if (
    !/^postgres(ql)?:\/\//i.test(databaseUrl) &&
    !/^prisma:\/\//i.test(databaseUrl)
  ) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL or Prisma Accelerate URL. " +
        "SQLite paths are no longer supported.",
    );
  }

  if (!fs.existsSync(options.sqlitePath)) {
    throw new Error(
      `SQLite database not found at ${options.sqlitePath}. ` +
        "Pass --sqlite <path> or set SQLITE_DATABASE_PATH.",
    );
  }

  const sqliteSha256 = sha256File(options.sqlitePath);
  const db = new Database(options.sqlitePath, { readonly: true, fileMustExist: true });

  try {
    console.log(`[migrate] Source: ${options.sqlitePath}`);
    console.log(`[migrate] SHA-256: ${sqliteSha256}`);
    console.log(`[migrate] Target: ${databaseHost()}`);

    if (options.rollback) {
      await rollback(options);
      await writeReport(
        {
          startedAt,
          finishedAt: new Date().toISOString(),
          mode: "rollback",
          sqlitePath: options.sqlitePath,
          sqliteSha256,
          databaseHost: databaseHost(),
          tables: [],
          issues: [],
          foreignKeyCheck: [],
          overall: "PASS",
        },
        options.reportDir,
      );
      return;
    }

    const fkCheck = tableExists(db, "sources")
      ? (db.prepare("PRAGMA foreign_key_check").all() as Array<Record<string, unknown>>)
      : [];

    const { prepared, issues, sourceCounts } = prepareData(
      db,
      options.skipInvalid,
    );

    if (issues.length > 0) {
      const fatal = issues.filter((issue) => issue.severity !== "warning");
      if (fatal.length > 0 && !options.skipInvalid) {
        console.error(
          `[migrate] ${fatal.length} transformation error(s) found. ` +
            "Nothing was written. Fix the data or re-run with --skip-invalid.",
        );
        for (const issue of fatal.slice(0, 50)) {
          console.error(`  - ${issue.table} ${issue.rowId}: ${issue.reason}`);
        }
        if (fatal.length > 50) console.error(`  … and ${fatal.length - 50} more.`);
        process.exitCode = 1;
        return;
      }
      const repaired = issues.length - fatal.length;
      if (repaired > 0) {
        console.warn(
          `[migrate] ${repaired} row(s) were repaired automatically (see report).`,
        );
      }
    }

    const tables: TableReport[] = [];

    if (options.dryRun) {
      for (const spec of TABLE_SPECS) {
        const preparedRows = (prepared[spec.table] as unknown[]).length;
        tables.push({
          table: spec.table,
          sourceRows: sourceCounts[spec.table] ?? 0,
          preparedRows,
          targetBefore: 0,
          insertedThisRun: 0,
          targetAfter: 0,
          missingIds: 0,
          missingSample: [],
          status: preparedRows === (sourceCounts[spec.table] ?? 0) ? "PASS" : "WARN",
        });
      }
    } else {
      let inserted: Record<string, number> = {};

      if (!options.verifyOnly) {
        inserted = await insertAll(prepared);
        for (const spec of TABLE_SPECS) {
          if (spec.identity) {
            await syncIdentitySequence(spec.table as IdentityTable);
          }
        }
      }

      for (const spec of TABLE_SPECS) {
        const info = await targetTableInfo(spec.table);
        const expected = preparedIds(prepared, spec.table);
        const missing = expected.filter((id) => !info.ids.has(id));

        if (!tableExists(db, spec.table)) {
          tables.push({
            table: spec.table,
            sourceRows: 0,
            preparedRows: 0,
            targetBefore: info.count,
            insertedThisRun: 0,
            targetAfter: info.count,
            missingIds: 0,
            missingSample: [],
            status: "SKIPPED",
          });
          continue;
        }

        const sourceRows = sourceCounts[spec.table] ?? 0;
        const preparedRows = expected.length;
        const insertedThisRun = inserted[spec.table] ?? 0;
        const status: TableReport["status"] =
          missing.length === 0
            ? preparedRows === sourceRows
              ? "PASS"
              : "WARN"
            : "FAIL";

        tables.push({
          table: spec.table,
          sourceRows,
          preparedRows,
          targetBefore: Math.max(0, info.count - insertedThisRun),
          insertedThisRun,
          targetAfter: info.count,
          missingIds: missing.length,
          missingSample: missing.slice(0, 10),
          status,
        });
      }
    }

    const overall: MigrationReport["overall"] = tables.some(
      (table) => table.status === "FAIL",
    )
      ? "FAIL"
      : tables.some((table) => table.status === "WARN") || issues.length > 0
        ? "WARN"
        : "PASS";

    const report: MigrationReport = {
      startedAt,
      finishedAt: new Date().toISOString(),
      mode: options.dryRun
        ? "dry-run"
        : options.verifyOnly
          ? "verify-only"
          : "migrate",
      sqlitePath: options.sqlitePath,
      sqliteSha256,
      databaseHost: databaseHost(),
      tables,
      issues,
      foreignKeyCheck: fkCheck,
      overall,
    };

    const reportPath = await writeReport(report, options.reportDir);

    console.log("");
    console.log("[migrate] ── Table summary ──────────────────────────────────");
    for (const table of tables) {
      console.log(
        `[migrate] ${table.table.padEnd(18)} ` +
          `source=${String(table.sourceRows).padStart(5)} ` +
          `prepared=${String(table.preparedRows).padStart(5)} ` +
          `inserted=${String(table.insertedThisRun).padStart(5)} ` +
          `target=${String(table.targetAfter).padStart(5)} ` +
          `missing=${String(table.missingIds).padStart(3)} ` +
          `${table.status}`,
      );
    }
    console.log("[migrate] ────────────────────────────────────────────────");
    console.log(`[migrate] Report: ${reportPath}`);
    console.log(`[migrate] Overall: ${overall}`);

    if (overall === "FAIL") {
      console.error("[migrate] Validation failed — inspect the report before going live.");
      process.exitCode = 1;
    }
  } finally {
    db.close();
    await closeDatabase();
  }
}

main().catch(async (error) => {
  console.error(
    "[migrate] Fatal:",
    error instanceof Error ? error.message : error,
  );
  await closeDatabase().catch(() => undefined);
  process.exitCode = 1;
});
