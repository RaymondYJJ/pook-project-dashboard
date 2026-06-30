-- Alert center workflow fields and expanded status/severity vocabulary.
ALTER TYPE "AlertSeverity" ADD VALUE IF NOT EXISTS 'green';
ALTER TYPE "AlertStatus" ADD VALUE IF NOT EXISTS 'ignored';

ALTER TABLE "alert_rules"
  ADD COLUMN IF NOT EXISTS "alert_type" TEXT NOT NULL DEFAULT 'data_quality';

ALTER TABLE "alert_events"
  ADD COLUMN IF NOT EXISTS "alert_type" TEXT NOT NULL DEFAULT 'data_quality',
  ADD COLUMN IF NOT EXISTS "metric" TEXT,
  ADD COLUMN IF NOT EXISTS "threshold" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "reason" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestion" TEXT,
  ADD COLUMN IF NOT EXISTS "source_label" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_name" TEXT,
  ADD COLUMN IF NOT EXISTS "handling_note" TEXT;

UPDATE "alert_rules" SET "alert_type" = CASE
  WHEN "code" LIKE 'cash_%' OR "code" LIKE 'operating_cashflow_%' THEN 'cashflow'
  WHEN "code" LIKE 'receivable_%' THEN 'receivable'
  WHEN "code" LIKE 'payable_%' OR "code" LIKE 'payables_%' THEN 'payable'
  WHEN "code" LIKE 'sku_available_%' THEN 'inventory_low'
  WHEN "code" LIKE 'inventory_high_%' THEN 'inventory_high'
  WHEN "code" LIKE 'sku_turnover_%' THEN 'slow_moving'
  WHEN "code" LIKE 'sku_no_sales_%' THEN 'no_sales'
  WHEN "code" LIKE 'sales_%' THEN 'sales_target'
  WHEN "code" LIKE 'promotion_%' THEN 'promotion_roi'
  ELSE 'data_quality'
END
WHERE "alert_type" = 'data_quality';

UPDATE "alert_events" SET "alert_type" = CASE
  WHEN "title" LIKE '%现金%' THEN 'cashflow'
  WHEN "title" LIKE '%应收%' THEN 'receivable'
  WHEN "title" LIKE '%应付%' THEN 'payable'
  WHEN "title" LIKE '%低库存%' THEN 'inventory_low'
  WHEN "title" LIKE '%高水位%' THEN 'inventory_high'
  WHEN "title" LIKE '%滞销%' THEN 'slow_moving'
  WHEN "title" LIKE '%不动销%' THEN 'no_sales'
  WHEN "title" LIKE '%销售%' THEN 'sales_target'
  WHEN "title" LIKE '%ROI%' OR "title" LIKE '%推广%' THEN 'promotion_roi'
  ELSE 'data_quality'
END
WHERE "alert_type" = 'data_quality';

CREATE INDEX IF NOT EXISTS "alert_events_filter_idx"
ON "alert_events" ("project_id", "alert_type", "severity", "status", "owner_name", "created_at");
