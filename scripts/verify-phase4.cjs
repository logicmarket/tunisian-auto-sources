/**
 * scripts/verify-phase4.cjs
 * Purpose: Post-seed integrity checks for the interactive layer.
 * Run: node scripts/verify-phase4.cjs
 */

const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "..", "data", "car-sources.db");

const db = new Database(dbPath, { readonly: true });

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const symptoms = db.prepare("SELECT COUNT(*) AS c FROM symptoms").get().c;
const mappings = db.prepare("SELECT COUNT(*) AS c FROM symptom_mapping").get().c;
const codes = db.prepare("SELECT COUNT(*) AS c FROM obd_codes").get().c;
const sources = db.prepare("SELECT COUNT(*) AS c FROM sources").get().c;

check("38 symptoms seeded", symptoms === 38, `${symptoms} rows`);
check(">= 100 conservative mappings", mappings >= 100, `${mappings} rows`);
check("442 OBD codes present", codes === 442, `${codes} rows`);
check("141 sources present", sources === 141, `${sources} rows`);

const missingCodes = db
  .prepare(
    `SELECT DISTINCT m.obd_code AS code
       FROM symptom_mapping m
       LEFT JOIN obd_codes c ON c.code = m.obd_code COLLATE NOCASE
      WHERE c.code IS NULL
      ORDER BY m.obd_code`,
  )
  .all()
  .map((row) => row.code);
check("every mapped code exists", missingCodes.length === 0, missingCodes.join(", ") || "0 missing");

const duplicates = db
  .prepare(
    `SELECT symptom_id, obd_code, COUNT(*) AS c
       FROM symptom_mapping
      GROUP BY symptom_id, obd_code
     HAVING c > 1`,
  )
  .all();
check("no duplicate symptom→code pairs", duplicates.length === 0, `${duplicates.length} duplicates`);

const nonApproximate = db
  .prepare("SELECT COUNT(*) AS c FROM symptom_mapping WHERE verification <> 'APPROXIMATE'")
  .get().c;
check("all mappings marked APPROXIMATE", nonApproximate === 0, `${nonApproximate} unmarked`);

const perSystem = db
  .prepare(
    `SELECT system_category, COUNT(*) AS c
       FROM symptoms
      GROUP BY system_category
      ORDER BY c DESC`,
  )
  .all();
check(
  "all 8 systems populated",
  perSystem.length === 8 && perSystem.every((row) => row.c > 0),
  perSystem.map((row) => `${row.system_category}:${row.c}`).join(", "),
);

const orphanMappings = db
  .prepare(
    `SELECT COUNT(*) AS c
       FROM symptom_mapping m
       LEFT JOIN symptoms s ON s.id = m.symptom_id
      WHERE s.id IS NULL`,
  )
  .get().c;
check("no mappings to unknown symptoms", orphanMappings === 0, `${orphanMappings} orphans`);

const tables = db
  .prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('symptoms','symptom_mapping','ratings','submissions','notifications')
      ORDER BY name`,
  )
  .all()
  .map((row) => row.name);
check("Phase 4 tables exist", tables.length === 5, tables.join(", "));

const failed = checks.filter((entry) => !entry.ok);

console.log(`Database: ${dbPath}`);
console.log(`Symptoms: ${symptoms} · Mappings: ${mappings} · Codes: ${codes} · Sources: ${sources}\n`);
for (const entry of checks) {
  console.log(`${entry.ok ? "[PASS]" : "[FAIL]"} ${entry.name} — ${entry.detail}`);
}

db.close();

if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll Phase 4 data checks passed.");
