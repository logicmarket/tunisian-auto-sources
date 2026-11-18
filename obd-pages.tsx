/**
 * Phase 3 deliverable — OBD list and detail pages.
 *
 * The live implementations live in the Next.js App Router:
 *   ./app/obd-codes/page.tsx         — searchable directory, P/B/C/U tabs,
 *                                      severity filter, 50-per-page pagination.
 *   ./app/obd-codes/[code]/page.tsx  — full code sheet a–j, related sources,
 *                                      similar codes, print-friendly poster.
 *
 * This module re-exports both page components as a single deliverable file.
 */

export { default as ObdCodesPage } from "./app/obd-codes/page";
export { default as ObdCodeDetailPage } from "./app/obd-codes/[code]/page";
