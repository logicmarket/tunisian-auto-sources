/**
 * File: scripts/test-phase4-migration.cjs
 * Purpose: Run database/migrations/004_phase4_interactive.sql against a copy
 * of the live database and assert the seed is complete and consistent.
 *
 * Usage: node scripts/test-phase4-migration.cjs
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

const source = path.join(process.cwd(), "data", "car-sources.db");
const temp = path.join(os.tmpdir(), `tas-migration-${Date.now()}.db`);
fs.copyFileSync(source, temp);

const db = new Database(temp);
const sql = fs.readFileSync(
  path.join(process.cwd(), "database", "migrations", "004_phase4_interactive.sql"),
  "utf8",
);
db.exec(sql);

const checks = {
  symptoms: db.prepare("SELECT COUNT(*) AS c FROM symptoms").get().c,
  mappings: db.prepare("SELECT COUNT(*) AS c FROM symptom_mapping").get().c,
  approximate: db
    .prepare("SELECT COUNT(*) AS c FROM symptom_mapping WHERE verification = 'APPROXIMATE'")
    .get().c,
  dangling: db
    .prepare(
      "SELECT COUNT(*) AS c FROM symptom_mapping m LEFT JOIN obd_codes o ON o.code = m.obd_code WHERE o.code IS NULL",
    )
    .get().c,
  systems: db
    .prepare("SELECT system_category, COUNT(*) AS c FROM symptoms GROUP BY system_category ORDER BY system_category")
    .all(),
};

console.log(checks);
db.close();
fs.rmSync(temp, { force: true });

const ok =
  checks.symptoms === 38 &&
  checks.mappings === 116 &&
  checks.approximate === 116 &&
  checks.dangling === 0 &&
  checks.systems.length === 8;
console.log(ok ? "[OK] migration matches the catalogue." : "[FAIL] migration mismatch.");
process.exitCode = ok ? 0 : 1;
