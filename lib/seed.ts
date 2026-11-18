/**
 * File: lib/seed.ts
 * Purpose: Idempotent seed loader for PostgreSQL. Reads the Phase 0 sources
 * and Phase 3 OBD exports, validates them, and writes with Prisma.
 *
 * Idempotency
 * • Sources: URL is UNIQUE + `createMany({ skipDuplicates: true })`.
 * • OBD codes: code is UNIQUE + `upsert`, so corrected descriptions refresh.
 * • Symptoms/mappings: deterministic ids + `upsert`.
 *
 * Production note: `ensureSeeded()` is a no-op in production unless
 * `ALLOW_RUNTIME_SEEDING=true`. Vercel builds/deploys should run
 * `npm run db:deploy && npm run db:seed` instead of seeding per request.
 */

import fs from "node:fs";
import path from "node:path";
import { prisma, syncIdentitySequence } from "./db";
import { seedPhase4Data } from "./phase4/seed";
import { SYMPTOMS } from "./phase4/symptom-catalog";
import type { ObdCodeSeed, SeedResult, SeedSource } from "./types";

const DEFAULT_SOURCES_PATH = path.join("data", "sources.json");
const DEFAULT_OBD_PATH = path.join("data", "obd-codes.json");
const ROOT_OBD_FALLBACK = "obd-codes-database.json";

function resolveDataPath(envName: string, fallback: string): string {
  const configured = process.env[envName]?.trim();
  if (!configured) return path.join(process.cwd(), fallback);
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRating(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) return 0;
  return Math.min(5, Math.max(0, Number(numeric.toFixed(1))));
}

/** Converts a string or an array of lines into a single TEXT block. */
function asTextBlock(value: unknown): string | null {
  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => asText(entry))
      .filter((entry): entry is string => entry !== null);
    return lines.length > 0 ? lines.join("\n") : null;
  }
  return asText(value);
}

function readJsonFile(filePath: string, label: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${label} not found at ${filePath}. ` +
        "Expected the Phase 0 export in data/sources.json. " +
        "Restore the file or set SEED_DATA_PATH.",
    );
  }

  const contents = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    throw new Error(
      `Could not parse ${label} at ${filePath}: ${
        error instanceof Error ? error.message : "invalid JSON"
      }`,
    );
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function normalizeSource(raw: unknown): { source: SeedSource | null; reason?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { source: null, reason: "not an object" };
  }

  const record = raw as Record<string, unknown>;
  const name = asText(record.name);
  const descriptionAr = asText(record.description_ar);
  const categorySystem = asText(record.category_system);
  const categoryTask = asText(record.category_task);
  const language = asText(record.language);

  if (!name || !descriptionAr || !categorySystem || !categoryTask || !language) {
    return { source: null, reason: "missing required field" };
  }

  const idValue = record.id;
  const numericId =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string" && /^\d+$/.test(idValue)
        ? Number(idValue)
        : null;

  const url = asText(record.url) ?? "";
  if (!url) {
    // Phase 0 marked these records INCOMPLETE (S023, S060–S067).
    return { source: null, reason: "incomplete: no URL" };
  }

  if (!isHttpUrl(url)) {
    return { source: null, reason: "invalid URL" };
  }

  return {
    source: {
      id: numericId && numericId > 0 ? numericId : undefined,
      name,
      url,
      description_ar: descriptionAr,
      description_fr: asText(record.description_fr),
      category_system: categorySystem,
      category_task: categoryTask,
      language,
      link_status: (asText(record.link_status) ?? "UNVERIFIED").toUpperCase(),
      last_verified: asText(record.last_verified),
      rating: asRating(record.rating),
      notes: asText(record.notes),
    },
  };
}

/**
 * Inserts all publishable sources. Returns a structured summary for the CLI.
 * Existing URLs are never overwritten.
 */
export async function seedSources(): Promise<SeedResult> {
  const sourcesPath = resolveDataPath("SEED_DATA_PATH", DEFAULT_SOURCES_PATH);
  const raw = readJsonFile(sourcesPath, "Sources seed file");

  if (!Array.isArray(raw)) {
    throw new Error(
      `Sources seed file at ${sourcesPath} must contain a JSON array.`,
    );
  }

  let skippedInvalid = 0;
  let skippedIncomplete = 0;
  const invalidReasons: string[] = [];
  const incompleteNames: string[] = [];
  const seenUrls = new Set<string>();
  const valid: SeedSource[] = [];

  for (const entry of raw) {
    const { source, reason } = normalizeSource(entry);

    if (!source) {
      if (reason === "incomplete: no URL") {
        skippedIncomplete += 1;
        incompleteNames.push(
          typeof (entry as Record<string, unknown>)?.name === "string"
            ? ((entry as Record<string, unknown>).name as string)
            : "بدون اسم",
        );
      } else {
        skippedInvalid += 1;
        if (reason) invalidReasons.push(reason);
      }
      continue;
    }

    if (seenUrls.has(source.url)) {
      skippedInvalid += 1;
      invalidReasons.push(`duplicate URL in seed file: ${source.url}`);
      continue;
    }

    seenUrls.add(source.url);
    valid.push(source);
  }

  const result = await prisma.source.createMany({
    data: valid.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name,
      url: row.url,
      description_ar: row.description_ar,
      description_fr: row.description_fr ?? null,
      category_system: row.category_system,
      category_task: row.category_task,
      language: row.language,
      link_status: row.link_status ?? "UNVERIFIED",
      last_verified: row.last_verified ?? null,
      rating: row.rating ?? 0,
      notes: row.notes ?? null,
    })),
    skipDuplicates: true,
  });

  const insertedSources = result.count;
  const skippedDuplicates = valid.length - insertedSources;

  // Explicit ids were copied from SQLite; move the identity sequence forward.
  await syncIdentitySequence("sources");

  if (incompleteNames.length > 0) {
    console.warn(
      `[seed] Skipped ${incompleteNames.length} incomplete source(s) with no publishable URL: ` +
        incompleteNames.join("، "),
    );
  }

  if (invalidReasons.length > 0) {
    console.warn(`[seed] Skipped ${invalidReasons.length} invalid record(s):`);
    for (const reason of invalidReasons) console.warn(`  - ${reason}`);
  }

  console.log(`[seed] Seeded ${insertedSources} sources successfully.`);
  console.log(
    `[seed] Source summary: ${raw.length} records, ${valid.length} valid, ` +
      `${insertedSources} inserted, ${skippedDuplicates} already present, ` +
      `${skippedIncomplete} incomplete, ${skippedInvalid} invalid.`,
  );

  return {
    totalRecords: raw.length,
    validRecords: valid.length,
    insertedSources,
    skippedDuplicates,
    skippedIncomplete,
    skippedInvalid,
    insertedObdCodes: 0,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Seeds / refreshes the Phase 3 OBD catalogue. Upserts by code so corrected
 * descriptions and severities replace older rows without creating duplicates.
 */
export async function seedObdCodes(): Promise<number> {
  let obdPath = resolveDataPath("OBD_DATA_PATH", DEFAULT_OBD_PATH);
  if (!fs.existsSync(obdPath)) {
    const fallback = path.join(process.cwd(), ROOT_OBD_FALLBACK);
    if (fs.existsSync(fallback)) obdPath = fallback;
  }

  if (!fs.existsSync(obdPath)) {
    console.warn(`[seed] OBD database not found at ${obdPath}; skipping OBD seed.`);
    return 0;
  }

  const raw = readJsonFile(obdPath, "OBD database");
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { codes?: unknown }).codes)
      ? ((raw as { codes: unknown[] }).codes)
      : [];

  if (rows.length === 0) {
    throw new Error(
      `OBD database at ${obdPath} must be a JSON array or an object with a "codes" array.`,
    );
  }

  const list = rows
    .map((item): ObdCodeSeed | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const code = asText(record.code)?.toUpperCase();
      const category = asText(record.category);
      if (!code || !category) return null;
      return {
        code,
        category,
        system_category: asText(record.system_category),
        related_system: asText(record.related_system),
        name_ar: asText(record.name_ar),
        name_en: asText(record.name_en),
        description: asText(record.description),
        causes: asTextBlock(record.causes),
        diagnosis_steps: asTextBlock(record.diagnosis_steps),
        severity: asText(record.severity) ?? "Medium",
        verification: asText(record.verification) ?? "VERIFIED",
        source_note: asText(record.source_note),
        family: asText(record.family),
      };
    })
    .filter((row): row is ObdCodeSeed => row !== null);

  const existing = new Set(
    (
      await prisma.obdCode.findMany({
        where: { code: { in: list.map((row) => row.code) } },
        select: { code: true },
      })
    ).map((row) => row.code),
  );

  let written = 0;

  for (const batch of chunk(list, 50)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.obdCode.upsert({
          where: { code: row.code },
          create: {
            code: row.code,
            category: row.category,
            system_category: row.system_category ?? null,
            related_system: row.related_system ?? null,
            name_ar: row.name_ar ?? null,
            name_en: row.name_en ?? null,
            description: row.description ?? null,
            causes: Array.isArray(row.causes)
              ? row.causes.join("\n")
              : (row.causes ?? null),
            diagnosis_steps: Array.isArray(row.diagnosis_steps)
              ? row.diagnosis_steps.join("\n")
              : (row.diagnosis_steps ?? null),
            severity: row.severity ?? "Medium",
            verification: row.verification ?? "VERIFIED",
            source_note: row.source_note ?? null,
            family: row.family ?? null,
          },
          update: {
            category: row.category,
            system_category: row.system_category ?? null,
            related_system: row.related_system ?? null,
            name_ar: row.name_ar ?? null,
            name_en: row.name_en ?? null,
            description: row.description ?? null,
            causes: Array.isArray(row.causes)
              ? row.causes.join("\n")
              : (row.causes ?? null),
            diagnosis_steps: Array.isArray(row.diagnosis_steps)
              ? row.diagnosis_steps.join("\n")
              : (row.diagnosis_steps ?? null),
            severity: row.severity ?? "Medium",
            verification: row.verification ?? "VERIFIED",
            source_note: row.source_note ?? null,
            family: row.family ?? null,
          },
        }),
      ),
    );
    written += batch.length;
  }

  const created = list.filter((row) => !existing.has(row.code)).length;
  console.log(
    `[seed] Seeded ${written} OBD codes (${created} new, ${written - created} updated).`,
  );
  return written;
}

/** Full, idempotent seed run used by `npm run db:seed` and `db:setup`. */
export async function seedDatabase(): Promise<SeedResult> {
  const result = await seedSources();
  result.insertedObdCodes = await seedObdCodes();
  const phase4 = await seedPhase4Data();
  console.log(
    `[seed] Interactive layer: ${phase4.symptoms} symptoms, ` +
      `${phase4.mappings} mappings (${phase4.skippedMappings} skipped).`,
  );
  return result;
}

let ensurePromise: Promise<void> | null = null;

/**
 * Called by pages and API handlers. Seeds once per Node.js process when the
 * database is empty; subsequent calls resolve immediately.
 *
 * In production this is a no-op unless ALLOW_RUNTIME_SEEDING=true, because
 * Vercel's ephemeral functions must not write seed data during requests.
 */
export function ensureSeeded(): Promise<void> {
  const runtimeSeedingAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_RUNTIME_SEEDING === "true";

  if (!runtimeSeedingAllowed) return Promise.resolve();

  if (!ensurePromise) {
    ensurePromise = Promise.resolve()
      .then(async () => {
        const sourceCount = await prisma.source.count();

        if (sourceCount === 0) {
          await seedDatabase();
          return;
        }

        const obdCount = await prisma.obdCode.count();

        if (obdCount < 300) {
          await seedObdCodes();
        }

        const symptomCount = await prisma.symptom.count();

        if (symptomCount < SYMPTOMS.length) {
          await seedPhase4Data();
        }
      })
      .catch((error) => {
        // Allow a later request to retry after a transient failure.
        ensurePromise = null;
        throw error;
      });
  }

  return ensurePromise;
}
