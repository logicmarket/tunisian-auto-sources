/**
 * File: scripts/emit-phase4-seed.ts
 * Purpose: Regenerate the seed section of
 * database/migrations/004_phase4_interactive.sql from the TypeScript
 * catalogue, so the migration and the runtime seed can never drift apart.
 *
 * Usage: npx tsx scripts/emit-phase4-seed.ts
 */

import fs from "node:fs";
import path from "node:path";
import {
  SYMPTOMS,
  SYMPTOM_MAPPINGS,
  toSymptomRecords,
} from "../lib/phase4/symptom-catalog";

const target = path.join(
  process.cwd(),
  "database",
  "migrations",
  "004_phase4_interactive.sql",
);

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const symptomRows = toSymptomRecords()
  .map(
    (symptom) =>
      `  (${quote(symptom.id)}, ${quote(symptom.name_ar)}, ${quote(
        symptom.name_en,
      )}, ${quote(symptom.system_category)}, ${symptom.sort_order})`,
  )
  .join(",\n");

const mappingRows = SYMPTOM_MAPPINGS.map((mapping, index) => {
  const brands = quote(JSON.stringify(mapping.common_brands));
  const head =
    index === 0
      ? "  SELECT"
      : "  UNION ALL SELECT";
  return `${head} ${quote(mapping.symptom_id)} AS symptom_id, ${quote(
    mapping.obd_code,
  )} AS obd_code, ${quote(mapping.confidence)} AS confidence, ${brands} AS common_brands, ${
    mapping.priority_rank
  } AS priority_rank, ${quote(mapping.rationale_ar)} AS rationale_ar`;
}).join("\n");

let sql = fs.readFileSync(target, "utf8");
sql = sql.replace("-- __SYMPTOMS_SEED__", symptomRows);
sql = sql.replace("-- __MAPPINGS_SEED__", mappingRows);
fs.writeFileSync(target, sql, "utf8");

console.log(
  `[migration] ${SYMPTOMS.length} symptoms, ${SYMPTOM_MAPPINGS.length} mappings written to ${target}`,
);
