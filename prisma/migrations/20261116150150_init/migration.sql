-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "description_fr" TEXT,
    "category_system" TEXT NOT NULL,
    "category_task" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "link_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "last_verified" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "slug" TEXT,
    "submission_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obd_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "system_category" TEXT,
    "related_system" TEXT,
    "name_ar" TEXT,
    "name_en" TEXT,
    "description" TEXT,
    "causes" TEXT,
    "diagnosis_steps" TEXT,
    "severity" TEXT DEFAULT 'Medium',
    "verification" TEXT DEFAULT 'VERIFIED',
    "source_note" TEXT,
    "family" TEXT,

    CONSTRAINT "obd_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "system_category" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_mapping" (
    "id" SERIAL NOT NULL,
    "symptom_id" TEXT NOT NULL,
    "obd_code" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "common_brands" TEXT NOT NULL DEFAULT '[]',
    "priority_rank" INTEGER NOT NULL DEFAULT 0,
    "rationale_ar" TEXT,
    "verification" TEXT NOT NULL DEFAULT 'APPROXIMATE',

    CONSTRAINT "symptom_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "helpful" INTEGER,
    "flagged" INTEGER NOT NULL DEFAULT 0,
    "flag_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "suggested_system" TEXT NOT NULL,
    "suggested_task" TEXT NOT NULL,
    "reason" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewer_note" TEXT,
    "status_token" TEXT NOT NULL,
    "recaptcha_score" DOUBLE PRECISION,
    "spam_flags" TEXT,
    "ip_address" TEXT,
    "published_source_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_feedback" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE UNIQUE INDEX "sources_slug_key" ON "sources"("slug");

-- CreateIndex
CREATE INDEX "sources_category_system_idx" ON "sources"("category_system");

-- CreateIndex
CREATE INDEX "sources_category_task_idx" ON "sources"("category_task");

-- CreateIndex
CREATE INDEX "sources_language_idx" ON "sources"("language");

-- CreateIndex
CREATE INDEX "sources_link_status_idx" ON "sources"("link_status");

-- CreateIndex
CREATE INDEX "sources_rating_idx" ON "sources"("rating" DESC);

-- CreateIndex
CREATE INDEX "sources_created_at_idx" ON "sources"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sources_submission_id_idx" ON "sources"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "obd_codes_code_key" ON "obd_codes"("code");

-- CreateIndex
CREATE INDEX "obd_codes_category_idx" ON "obd_codes"("category");

-- CreateIndex
CREATE INDEX "obd_codes_system_category_idx" ON "obd_codes"("system_category");

-- CreateIndex
CREATE INDEX "obd_codes_family_idx" ON "obd_codes"("family");

-- CreateIndex
CREATE INDEX "obd_codes_severity_idx" ON "obd_codes"("severity");

-- CreateIndex
CREATE INDEX "obd_codes_verification_idx" ON "obd_codes"("verification");

-- CreateIndex
CREATE INDEX "symptoms_system_category_sort_order_idx" ON "symptoms"("system_category", "sort_order");

-- CreateIndex
CREATE INDEX "symptom_mapping_symptom_id_priority_rank_idx" ON "symptom_mapping"("symptom_id", "priority_rank");

-- CreateIndex
CREATE INDEX "symptom_mapping_obd_code_idx" ON "symptom_mapping"("obd_code");

-- CreateIndex
CREATE INDEX "symptom_mapping_confidence_idx" ON "symptom_mapping"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_mapping_symptom_id_obd_code_key" ON "symptom_mapping"("symptom_id", "obd_code");

-- CreateIndex
CREATE INDEX "ratings_source_id_stars_idx" ON "ratings"("source_id", "stars");

-- CreateIndex
CREATE INDEX "ratings_visitor_id_idx" ON "ratings"("visitor_id");

-- CreateIndex
CREATE INDEX "ratings_flagged_idx" ON "ratings"("flagged");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_source_id_visitor_id_key" ON "ratings"("source_id", "visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_status_token_key" ON "submissions"("status_token");

-- CreateIndex
CREATE INDEX "submissions_status_created_at_idx" ON "submissions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_normalized_url_idx" ON "submissions"("normalized_url");

-- CreateIndex
CREATE INDEX "submissions_ip_address_created_at_idx" ON "submissions"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "submissions_published_source_id_idx" ON "submissions"("published_source_id");

-- CreateIndex
CREATE INDEX "source_feedback_source_id_kind_idx" ON "source_feedback"("source_id", "kind");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- AddForeignKey
ALTER TABLE "symptom_mapping" ADD CONSTRAINT "symptom_mapping_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_mapping" ADD CONSTRAINT "symptom_mapping_obd_code_fkey" FOREIGN KEY ("obd_code") REFERENCES "obd_codes"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_published_source_id_fkey" FOREIGN KEY ("published_source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_feedback" ADD CONSTRAINT "source_feedback_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
