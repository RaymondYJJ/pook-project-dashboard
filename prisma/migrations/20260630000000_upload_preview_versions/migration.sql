-- Upload preview, confirmation, versioning, and rollback metadata.
CREATE TYPE "ReportType" AS ENUM ('finance', 'management', 'sales', 'promotion', 'inventory', 'purchase');

ALTER TYPE "UploadStatus" ADD VALUE IF NOT EXISTS 'rolled_back';

ALTER TABLE "upload_batches"
  ADD COLUMN IF NOT EXISTS "report_type" "ReportType",
  ADD COLUMN IF NOT EXISTS "report_date" DATE,
  ADD COLUMN IF NOT EXISTS "report_month" DATE,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "preview" JSONB,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "active_at" TIMESTAMP(3);

ALTER TABLE "source_files"
  ADD COLUMN IF NOT EXISTS "report_type" "ReportType",
  ADD COLUMN IF NOT EXISTS "report_date" DATE,
  ADD COLUMN IF NOT EXISTS "report_month" DATE,
  ADD COLUMN IF NOT EXISTS "is_active_version" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);

UPDATE "source_files" SET "report_type" = "parser_type"::"ReportType"
WHERE "report_type" IS NULL AND "parser_type" IN ('finance', 'management', 'sales', 'promotion', 'inventory', 'purchase');

UPDATE "upload_batches" b
SET
  "report_type" = s."report_type",
  "report_date" = s."report_date",
  "report_month" = s."report_month",
  "version" = s."version",
  "preview" = s."parse_summary"
FROM "source_files" s
WHERE b."id" = s."upload_batch_id" AND b."report_type" IS NULL;

CREATE INDEX IF NOT EXISTS "source_files_project_type_date_active_idx"
ON "source_files" ("project_id", "report_type", "report_date", "is_active_version");

CREATE INDEX IF NOT EXISTS "source_files_project_type_month_active_idx"
ON "source_files" ("project_id", "report_type", "report_month", "is_active_version");
