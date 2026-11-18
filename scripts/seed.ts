import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

import { closeDatabase } from "../lib/db";
import { seedDatabase } from "../lib/seed";

/**
 * CLI seeder: `npm run db:seed`
 *
 * Idempotent. Safe to run on every deploy:
 *   - sources are skipped when their URL already exists
 *   - OBD codes are upserted by code
 *   - symptoms/mappings are upserted by their deterministic keys
 */
async function main(): Promise<void> {
  try {
    const result = await seedDatabase();

    console.log("");
    console.log("[seed] Database ready.");
    console.log(
      `[seed] Seeded ${result.insertedSources} sources, ` +
        `${result.insertedObdCodes} OBD codes.`,
    );
    console.log(
      `[seed] ${result.skippedDuplicates} sources already present, ` +
        `${result.skippedIncomplete} incomplete, ` +
        `${result.skippedInvalid} invalid.`,
    );
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(
    "[seed] Failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
