/**
 * File: lib/phase4/seed.ts
 * Purpose: Idempotent seeding for the diagnostic layer: symptoms and
 * conservative symptom → code mappings. Safe to run on every deploy; it never
 * deletes mechanic-generated data.
 */

import { prisma } from "@/lib/db";
import {
  SYMPTOMS,
  SYMPTOM_MAPPINGS,
  toSymptomRecords,
} from "@/lib/phase4/symptom-catalog";

export interface Phase4SeedResult {
  symptoms: number;
  mappings: number;
  skippedMappings: number;
}

let seedPromise: Promise<void> | null = null;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function seedPhase4Data(): Promise<Phase4SeedResult> {
  const symptomRows = toSymptomRecords();

  await prisma.$transaction(
    symptomRows.map((symptom) =>
      prisma.symptom.upsert({
        where: { id: symptom.id },
        create: {
          id: symptom.id,
          name_ar: symptom.name_ar,
          name_en: symptom.name_en,
          system_category: symptom.system_category,
          sort_order: symptom.sort_order,
        },
        update: {
          name_ar: symptom.name_ar,
          name_en: symptom.name_en,
          system_category: symptom.system_category,
          sort_order: symptom.sort_order,
        },
      }),
    ),
  );

  const referencedCodes = Array.from(
    new Set(SYMPTOM_MAPPINGS.map((mapping) => mapping.obd_code)),
  );
  const knownCodes = new Set(
    (
      await prisma.obdCode.findMany({
        where: { code: { in: referencedCodes } },
        select: { code: true },
      })
    ).map((row) => row.code),
  );
  const knownSymptoms = new Set(SYMPTOMS.map((symptom) => symptom.id));

  const validMappings = SYMPTOM_MAPPINGS.filter((mapping) => {
    const known = knownCodes.has(mapping.obd_code);
    const symptomKnown = knownSymptoms.has(mapping.symptom_id);
    return known && symptomKnown;
  });

  const skippedMappings = SYMPTOM_MAPPINGS.length - validMappings.length;

  for (const batch of chunk(validMappings, 50)) {
    await prisma.$transaction(
      batch.map((mapping) =>
        prisma.symptomMapping.upsert({
          where: {
            symptom_id_obd_code: {
              symptom_id: mapping.symptom_id,
              obd_code: mapping.obd_code,
            },
          },
          create: {
            symptom_id: mapping.symptom_id,
            obd_code: mapping.obd_code,
            confidence: mapping.confidence,
            common_brands: JSON.stringify(mapping.common_brands),
            priority_rank: mapping.priority_rank,
            rationale_ar: mapping.rationale_ar,
            verification: "APPROXIMATE",
          },
          update: {
            confidence: mapping.confidence,
            common_brands: JSON.stringify(mapping.common_brands),
            priority_rank: mapping.priority_rank,
            rationale_ar: mapping.rationale_ar,
            verification: "APPROXIMATE",
          },
        }),
      ),
    );
  }

  return {
    symptoms: symptomRows.length,
    mappings: validMappings.length,
    skippedMappings,
  };
}

/**
 * Called once per process by `ensureSeeded`. Verifies the catalogue is
 * present without running the full seed when it already is.
 */
export function ensurePhase4Seeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = Promise.resolve()
      .then(async () => {
        const [symptomCount, mappingCount] = await Promise.all([
          prisma.symptom.count(),
          prisma.symptomMapping.count(),
        ]);

        if (
          symptomCount < SYMPTOMS.length ||
          mappingCount < SYMPTOM_MAPPINGS.length
        ) {
          await seedPhase4Data();
        }
      })
      .catch((error) => {
        seedPromise = null;
        throw error;
      });
  }
  return seedPromise;
}
