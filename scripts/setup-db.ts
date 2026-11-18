import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

import {
  checkDatabaseConnection,
  closeDatabase,
  prisma,
} from "../lib/db";
import { seedDatabase } from "../lib/seed";

/**
 * CLI database bootstrap.
 *
 * `npm run db:setup` runs `prisma migrate deploy` first, then this script:
 * connectivity check, then the Phase 0 sources, the OBD catalogue and the
 * Phase 4 symptoms/mappings. Never drops data.
 *
 * Running this file directly assumes the schema already exists
 * (`npx prisma migrate deploy` or `npx prisma db push`).
 */
async function main(): Promise<void> {
  try {
    await checkDatabaseConnection();

    const result = await seedDatabase();
    const [sources, obdCodes, symptoms, mappings] = await Promise.all([
      prisma.source.count(),
      prisma.obdCode.count(),
      prisma.symptom.count(),
      prisma.symptomMapping.count(),
    ]);

    console.log("");
    console.log("[db] PostgreSQL database ready");
    console.log(`[db] Sources: ${sources}`);
    console.log(`[db] OBD codes: ${obdCodes}`);
    console.log(`[db] Symptoms: ${symptoms}`);
    console.log(`[db] Symptom mappings: ${mappings}`);
    console.log(
      `[db] This run: ${result.insertedSources} sources inserted, ` +
        `${result.skippedDuplicates} already present, ` +
        `${result.skippedIncomplete} incomplete skipped.`,
    );
  } catch (error) {
    console.error(
      "[db] Setup failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
