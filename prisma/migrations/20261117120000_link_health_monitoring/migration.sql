-- Phase 5 · Task 3 — Link Health Monitoring
-- Additive, non-destructive migration.
--   * sources.is_hidden        — soft-hide a source from public listings
--   * link_reports             — append-only check history (one row per check)
--
-- Rollback (manual, only with explicit approval):
--   DROP TABLE "link_reports";
--   DROP INDEX "sources_is_hidden_idx";
--   ALTER TABLE "sources" DROP COLUMN "is_hidden";

-- 1. Soft-hide flag on sources ------------------------------------------------

ALTER TABLE "sources" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "sources_is_hidden_idx" ON "sources"("is_hidden");

-- 2. Health-check history -----------------------------------------------------

CREATE TABLE "link_reports" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status_code" INTEGER,
    "final_url" TEXT,
    "link_status" TEXT NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "link_reports_source_id_checked_at_idx"
    ON "link_reports"("source_id", "checked_at" DESC);

CREATE INDEX "link_reports_link_status_checked_at_idx"
    ON "link_reports"("link_status", "checked_at" DESC);

CREATE INDEX "link_reports_checked_at_idx"
    ON "link_reports"("checked_at" DESC);

ALTER TABLE "link_reports"
    ADD CONSTRAINT "link_reports_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
