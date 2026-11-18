/**
 * File: lib/phase4/diagnosis.ts
 * Purpose: Server-side engine for the guided diagnostic tool (PostgreSQL).
 *
 * Path A resolves a single OBD code with related codes + source suggestions.
 * Path B scores the chosen symptoms against `symptom_mapping` and returns the
 * top three documented candidates with an explicit "approximate" flag.
 */

import { Prisma, type Source } from "@prisma/client";
import { prisma, withDatabaseRetry } from "@/lib/db";
import { toObdCodeRecord, toSourceRecord } from "@/lib/mappers";
import {
  getObdCodeByCode,
  getRelatedObdCodes,
  searchObdCodes,
} from "@/lib/obd";
import { ensureSeeded } from "@/lib/seed";
import {
  DIAGNOSIS_BRANDS,
  INITIAL_STEPS,
  SYMPTOMS,
  SYMPTOM_MAPPINGS,
  SYMPTOM_SYSTEMS,
  symptomsForSystem,
  type DiagnosisBrand,
} from "@/lib/phase4/symptom-catalog";
import type {
  DiagnosisBySymptomResult,
  DiagnosisCodeDetail,
  DiagnosisConfidence,
  DiagnosisMatch,
  ObdCodeRecord,
  SourceRecord,
  SymptomRecord,
  SymptomSystemId,
} from "@/lib/types";

/** Maps an OBD system to the portal's source taxonomy. */
const OBD_TO_SOURCE_SYSTEMS: Record<string, string[]> = {
  "Engine / Ignition": ["Engine", "Diagnostics"],
  "Engine / Sensors & Actuators": ["Engine", "Diagnostics"],
  "Fuel & Air Metering": ["Fuel & Injection", "Engine", "Diagnostics"],
  "Emissions & EVAP": ["Exhaust & Emissions", "Diagnostics"],
  Transmission: ["Transmission", "Diagnostics"],
  "Chassis / ABS & Stability": ["Diagnostics", "Suspension & Steering"],
  "Body / SRS & Safety": ["Diagnostics"],
  "Electrical System": ["Electrical & Electronics", "Diagnostics"],
  "Network / Communication": ["Electrical & Electronics", "Diagnostics"],
  "Cooling System": ["Cooling & AC", "Diagnostics"],
};

const SEVERITY_WEIGHT: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const CONFIDENCE_WEIGHT: Record<DiagnosisConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const CONFIDENCE_ORDER: DiagnosisConfidence[] = ["high", "medium", "low"];

function clampConfidence(value: unknown): DiagnosisConfidence {
  return CONFIDENCE_ORDER.includes(value as DiagnosisConfidence)
    ? (value as DiagnosisConfidence)
    : "low";
}

/** Fetch the best-rated sources for one OBD system family. */
export async function getSourceRecommendations(
  systemCategory: string | null | undefined,
  limit = 3,
): Promise<SourceRecord[]> {
  await ensureSeeded();
  const safeLimit = Math.min(6, Math.max(1, Math.trunc(limit)));

  const preferred = OBD_TO_SOURCE_SYSTEMS[systemCategory ?? ""] ?? [
    "Diagnostics",
  ];

  const primary = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT *
          FROM "sources"
         WHERE url <> ''
           AND "is_hidden" = false
           AND category_system IN (${Prisma.join(preferred)})
         ORDER BY
           CASE link_status WHEN 'LIVE' THEN 0 WHEN 'REDIRECT' THEN 1 ELSE 2 END,
           rating DESC,
           id ASC
         LIMIT ${safeLimit}
      `),
    { label: "source-recommendations" },
  );

  if (primary.length >= safeLimit) return primary.map(toSourceRecord);

  const excluded = primary.map((source) => source.id);
  const remaining = safeLimit - primary.length;
  if (remaining <= 0) return primary.map(toSourceRecord);

  const exclusion =
    excluded.length > 0
      ? Prisma.sql`AND id NOT IN (${Prisma.join(excluded)})`
      : Prisma.empty;

  const extra = await withDatabaseRetry(
    () =>
      prisma.$queryRaw<Source[]>(Prisma.sql`
        SELECT *
          FROM "sources"
         WHERE url <> ''
           AND "is_hidden" = false
           AND category_system = 'General / Multi-system'
           ${exclusion}
         ORDER BY
           CASE link_status WHEN 'LIVE' THEN 0 WHEN 'REDIRECT' THEN 1 ELSE 2 END,
           rating DESC,
           id ASC
         LIMIT ${remaining}
      `),
    { label: "source-recommendations-fallback" },
  );

  return [...primary, ...extra].map(toSourceRecord);
}

export interface DiagnosisIndexEntry {
  code: string;
  name_ar: string | null;
  name_en: string | null;
  severity: string | null;
  system_category: string | null;
}

/** Lightweight client index for instant code search. */
export async function getDiagnosisIndex(): Promise<DiagnosisIndexEntry[]> {
  await ensureSeeded();
  return prisma.obdCode.findMany({
    select: {
      code: true,
      name_ar: true,
      name_en: true,
      severity: true,
      system_category: true,
    },
    orderBy: { code: "asc" },
  });
}

export async function getSymptomCatalog(): Promise<
  Array<{
    id: SymptomSystemId;
    name_ar: string;
    name_en: string;
    description: string;
    icon: string;
    tone: string;
    symptoms: SymptomRecord[];
  }>
> {
  await ensureSeeded();
  return SYMPTOM_SYSTEMS.map((system) => ({
    ...system,
    symptoms: symptomsForSystem(system.id).map((symptom, index) => ({
      ...symptom,
      sort_order: index,
    })),
  }));
}

/** Full Path A detail for one code. */
export async function getDiagnosisCode(
  code: string,
): Promise<DiagnosisCodeDetail | null> {
  await ensureSeeded();
  const record = await getObdCodeByCode(code);
  if (!record) return null;

  const [relatedCodes, sources, hints] = await Promise.all([
    getRelatedObdCodes(record.code, record.category, 6),
    getSourceRecommendations(record.system_category, 3),
    prisma.symptomMapping.findMany({
      where: { obd_code: { equals: record.code, mode: "insensitive" } },
      orderBy: { priority_rank: "asc" },
      take: 6,
      select: { symptom: { select: { name_ar: true } } },
    }),
  ]);

  return {
    code: record,
    relatedCodes,
    sources,
    symptomHints: hints.map((hint) => hint.symptom.name_ar),
    approximate: true,
  };
}

interface MappingRow {
  symptom_id: string;
  symptom_name: string;
  obd_code: string;
  confidence: string;
  common_brands: string;
  priority_rank: number;
  rationale_ar: string | null;
}

function parseBrands(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

/** Path B: score symptoms against the conservative mapping table. */
export async function diagnoseBySymptoms(
  symptomIds: string[],
  brandInput?: string | null,
): Promise<DiagnosisBySymptomResult> {
  await ensureSeeded();

  const unique = Array.from(new Set(symptomIds.filter(Boolean))).slice(0, 5);
  const validIds = new Set(SYMPTOMS.map((symptom) => symptom.id));
  const selectedIds = unique.filter((id) => validIds.has(id));
  const selected = selectedIds
    .map((id) => SYMPTOMS.find((symptom) => symptom.id === id))
    .filter((symptom): symptom is (typeof SYMPTOMS)[number] =>
      Boolean(symptom),
    );

  const brand: DiagnosisBrand | null = DIAGNOSIS_BRANDS.includes(
    brandInput as DiagnosisBrand,
  )
    ? (brandInput as DiagnosisBrand)
    : null;

  const systemsInvolved = Array.from(
    new Set(selected.map((symptom) => symptom.system_category)),
  );

  const initialSteps = Array.from(
    new Set(systemsInvolved.flatMap((system) => INITIAL_STEPS[system] ?? [])),
  ).slice(0, 8);

  if (selectedIds.length === 0) {
    return {
      symptoms: selected.map((symptom, index) => ({
        ...symptom,
        sort_order: index,
      })),
      brand,
      matches: [],
      initialSteps,
      approximate: true,
    };
  }

  const mappingRows = await prisma.symptomMapping.findMany({
    where: { symptom_id: { in: selectedIds } },
    select: {
      symptom_id: true,
      obd_code: true,
      confidence: true,
      common_brands: true,
      priority_rank: true,
      rationale_ar: true,
      symptom: { select: { name_ar: true } },
    },
  });

  const rows: MappingRow[] = mappingRows.map((row) => ({
    symptom_id: row.symptom_id,
    symptom_name: row.symptom.name_ar,
    obd_code: row.obd_code,
    confidence: row.confidence,
    common_brands: row.common_brands,
    priority_rank: row.priority_rank,
    rationale_ar: row.rationale_ar,
  }));

  interface Accumulator {
    code: string;
    score: number;
    matchedSymptoms: Set<string>;
    explanations: string[];
    brandMatched: boolean;
    bestConfidence: DiagnosisConfidence;
    bestRank: number;
  }

  const accumulators = new Map<string, Accumulator>();

  for (const row of rows) {
    const confidence = clampConfidence(row.confidence);
    const weight = CONFIDENCE_WEIGHT[confidence];
    const brands = parseBrands(row.common_brands);
    const brandMatched = brand !== null && brands.includes(brand);

    const existing = accumulators.get(row.obd_code) ?? {
      code: row.obd_code,
      score: 0,
      matchedSymptoms: new Set<string>(),
      explanations: [],
      brandMatched: false,
      bestConfidence: "low" as DiagnosisConfidence,
      bestRank: 99,
    };

    existing.score += weight + (brandMatched ? 2 : 0);
    existing.matchedSymptoms.add(row.symptom_name);
    if (row.rationale_ar && !existing.explanations.includes(row.rationale_ar)) {
      existing.explanations.push(row.rationale_ar);
    }
    existing.brandMatched = existing.brandMatched || brandMatched;
    if (CONFIDENCE_WEIGHT[confidence] > CONFIDENCE_WEIGHT[existing.bestConfidence]) {
      existing.bestConfidence = confidence;
    }
    existing.bestRank = Math.min(existing.bestRank, row.priority_rank);
    accumulators.set(row.obd_code, existing);
  }

  const ranked = Array.from(accumulators.values()).sort(
    (a, b) =>
      b.score - a.score ||
      b.matchedSymptoms.size - a.matchedSymptoms.size ||
      a.bestRank - b.bestRank ||
      a.code.localeCompare(b.code),
  );

  const top = ranked.slice(0, 3);
  if (top.length === 0) {
    return {
      symptoms: selected.map((symptom, index) => ({
        ...symptom,
        sort_order: index,
      })),
      brand,
      matches: [],
      initialSteps,
      approximate: true,
    };
  }

  const codeRows = await prisma.obdCode.findMany({
    where: { code: { in: top.map((entry) => entry.code) } },
  });
  const codeMap = new Map(
    codeRows.map((row) => [row.code, toObdCodeRecord(row)]),
  );

  const matches: DiagnosisMatch[] = [];

  for (const entry of top) {
    const code = codeMap.get(entry.code);
    if (!code) continue;

    const confidence: DiagnosisConfidence =
      entry.score >= 6 || (entry.bestConfidence === "high" && entry.matchedSymptoms.size >= 2)
        ? "high"
        : entry.score >= 4
          ? "medium"
          : "low";

    const [relatedCodes, sources] = await Promise.all([
      getRelatedObdCodes(code.code, code.category, 4),
      getSourceRecommendations(code.system_category, 3),
    ]);

    matches.push({
      code,
      confidence,
      score: Number(entry.score.toFixed(1)),
      matchedSymptoms: Array.from(entry.matchedSymptoms),
      explanations: entry.explanations.slice(0, 3),
      brandMatched: entry.brandMatched,
      approximate: true,
      relatedCodes,
      sources,
    });
  }

  // Severity is a tie-breaker so a critical candidate is never hidden behind
  // a low-severity one with an identical symptom score.
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      (SEVERITY_WEIGHT[b.code.severity ?? "Medium"] ?? 0) -
        (SEVERITY_WEIGHT[a.code.severity ?? "Medium"] ?? 0),
  );

  return {
    symptoms: selected.map((symptom, index) => ({
      ...symptom,
      sort_order: index,
    })),
    brand,
    matches: matches.slice(0, 3),
    initialSteps,
    approximate: true,
  };
}

/** API helper: debounced search across code, Arabic name and English name. */
export async function searchDiagnosisCodes(
  query: string,
  limit = 8,
): Promise<ObdCodeRecord[]> {
  return searchObdCodes(query, limit);
}

/** Used by the static verification script. */
export async function getCatalogStats(): Promise<{
  symptoms: number;
  systems: number;
  mappings: number;
  missingCodes: string[];
}> {
  const known = new Set(
    (
      await prisma.obdCode.findMany({ select: { code: true } })
    ).map((row) => row.code),
  );
  const missingCodes = Array.from(
    new Set(
      SYMPTOM_MAPPINGS.map((mapping) => mapping.obd_code).filter(
        (code) => !known.has(code),
      ),
    ),
  );

  return {
    symptoms: SYMPTOMS.length,
    systems: SYMPTOM_SYSTEMS.length,
    mappings: SYMPTOM_MAPPINGS.length,
    missingCodes,
  };
}
