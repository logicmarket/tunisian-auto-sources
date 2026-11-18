/**
 * File: scripts/clean-phase4-test-data.cjs
 * Purpose: Remove browser-generated Phase 4 test rows before delivery:
 * approved/rejected submissions, their published source, notifications and
 * ratings. Leaves the 141 curated sources and 442 OBD codes untouched.
 *
 * Usage: node scripts/clean-phase4-test-data.cjs
 */

const path = require("node:path");
const Database = require("better-sqlite3");

const db = new Database(path.join(process.cwd(), "data", "car-sources.db"));
db.pragma("foreign_keys = ON");

const before = {
  sources: db.prepare("SELECT COUNT(*) AS c FROM sources").get().c,
  submissions: db.prepare("SELECT COUNT(*) AS c FROM submissions").get().c,
  notifications: db.prepare("SELECT COUNT(*) AS c FROM notifications").get().c,
  ratings: db.prepare("SELECT COUNT(*) AS c FROM ratings").get().c,
};

db.transaction(() => {
  db.prepare("DELETE FROM notifications").run();
  db.prepare("DELETE FROM submissions").run();
  db.prepare("DELETE FROM ratings").run();
  db.prepare("DELETE FROM sources WHERE submission_id IS NOT NULL").run();
  db.prepare(
    "DELETE FROM sqlite_sequence WHERE name IN ('submissions','notifications','ratings')",
  ).run();
})();

db.exec("VACUUM");

const after = {
  sources: db.prepare("SELECT COUNT(*) AS c FROM sources").get().c,
  submissions: db.prepare("SELECT COUNT(*) AS c FROM submissions").get().c,
  notifications: db.prepare("SELECT COUNT(*) AS c FROM notifications").get().c,
  ratings: db.prepare("SELECT COUNT(*) AS c FROM ratings").get().c,
  symptoms: db.prepare("SELECT COUNT(*) AS c FROM symptoms").get().c,
  mappings: db.prepare("SELECT COUNT(*) AS c FROM symptom_mapping").get().c,
};

console.log({ before, after });
const ok =
  after.sources === 141 &&
  after.submissions === 0 &&
  after.notifications === 0 &&
  after.ratings === 0 &&
  after.symptoms === 38 &&
  after.mappings === 116;
console.log(ok ? "[OK] test data removed." : "[FAIL] unexpected counts.");
db.close();
process.exitCode = ok ? 0 : 1;
