-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('super_admin', 'owner', 'finance', 'operation', 'investor', 'readonly');

-- CreateEnum
CREATE TYPE "ProjectCode" AS ENUM ('taiyue', 'luxueya');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('pending', 'parsed', 'imported', 'failed');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('red', 'orange', 'yellow', 'info');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "code" "ProjectCode" NOT NULL,
    "name" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "role_code" "RoleCode" NOT NULL,
    "can_upload" BOOLEAN NOT NULL DEFAULT false,
    "can_manage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "uploaded_by_id" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_files" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "upload_batch_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "parser_type" TEXT,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parse_summary" JSONB,
    "quality_issues" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_snapshots" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "monetary_funds" DECIMAL(18,2),
    "receivables" DECIMAL(18,2),
    "prepayments" DECIMAL(18,2),
    "payables" DECIMAL(18,2),
    "revenue" DECIMAL(18,2),
    "net_profit" DECIMAL(18,2),
    "ending_cash" DECIMAL(18,2),
    "raw_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_snapshots" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "operating_cashflow" DECIMAL(18,2),
    "cash_inflow" DECIMAL(18,2),
    "cash_outflow" DECIMAL(18,2),
    "ending_cash" DECIMAL(18,2),
    "support_days" DECIMAL(12,2),
    "raw_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheet_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "category" TEXT,
    "item_name" TEXT NOT NULL,
    "ending_balance" DECIMAL(18,2),
    "opening_balance" DECIMAL(18,2),
    "side" TEXT,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "month_label" TEXT,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_payable_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "counterparty" TEXT,
    "subject_code" TEXT,
    "subject_name" TEXT,
    "ending_amount" DECIMAL(18,2),
    "due_date" DATE,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivable_payable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "account_name" TEXT,
    "transaction_type" TEXT,
    "debit_amount" DECIMAL(18,2),
    "credit_amount" DECIMAL(18,2),
    "balance" DECIMAL(18,2),
    "summary" TEXT,
    "counterparty" TEXT,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT true,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_report_rows" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_month" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "company" TEXT,
    "profit_center" TEXT,
    "store" TEXT,
    "channel" TEXT,
    "gmv" DECIMAL(18,2),
    "gsv" DECIMAL(18,2),
    "refund_rate" DECIMAL(10,4),
    "sales_outbound" DECIMAL(18,2),
    "sales_cost" DECIMAL(18,2),
    "purchase_sales_diff" DECIMAL(18,2),
    "ad_spend" DECIMAL(18,2),
    "platform_fees" DECIMAL(18,2),
    "promotion_fees" DECIMAL(18,2),
    "staff_fees" DECIMAL(18,2),
    "project_profit" DECIMAL(18,2),
    "profit_rate" DECIMAL(10,4),
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_report_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_daily_rows" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "channel" TEXT,
    "store" TEXT,
    "product_name" TEXT,
    "sku" TEXT,
    "payment_amount" DECIMAL(18,2),
    "actual_sales" DECIMAL(18,2),
    "gmv_target" DECIMAL(18,2),
    "completion_rate" DECIMAL(10,4),
    "paid_units" DECIMAL(18,2),
    "paid_buyers" DECIMAL(18,2),
    "visitors" DECIMAL(18,2),
    "page_views" DECIMAL(18,2),
    "conversion_rate" DECIMAL(10,4),
    "average_order_value" DECIMAL(18,2),
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_daily_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_daily_rows" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "channel" TEXT,
    "campaign" TEXT,
    "spend" DECIMAL(18,2),
    "impressions" DECIMAL(18,2),
    "clicks" DECIMAL(18,2),
    "transaction_amount" DECIMAL(18,2),
    "roi" DECIMAL(12,4),
    "cpc" DECIMAL(12,4),
    "click_rate" DECIMAL(12,4),
    "conversion_rate" DECIMAL(12,4),
    "cart_cost" DECIMAL(18,2),
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "quality_issue" TEXT,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_daily_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshots" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "inventory_amount" DECIMAL(18,2),
    "inventory_quantity" DECIMAL(18,2),
    "sales_7d" DECIMAL(18,2),
    "sales_30d" DECIMAL(18,2),
    "turnover_days" DECIMAL(12,2),
    "slow_moving_amount" DECIMAL(18,2),
    "low_stock_sku_count" INTEGER,
    "in_transit_amount" DECIMAL(18,2),
    "spot_rate" DECIMAL(10,4),
    "raw_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_sku_rows" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "sku" TEXT,
    "product_name" TEXT,
    "warehouse" TEXT,
    "inventory_quantity" DECIMAL(18,2),
    "inventory_amount" DECIMAL(18,2),
    "sales_7d" DECIMAL(18,2),
    "sales_30d" DECIMAL(18,2),
    "turnover_days" DECIMAL(12,2),
    "in_transit" DECIMAL(18,2),
    "is_defective" BOOLEAN NOT NULL DEFAULT false,
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_sku_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_rows" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT NOT NULL,
    "upload_batch_id" TEXT NOT NULL,
    "purchase_oa" TEXT,
    "sap_code" TEXT,
    "material_name" TEXT,
    "unit_price" DECIMAL(18,4),
    "purchase_quantity" DECIMAL(18,2),
    "actual_inbound" DECIMAL(18,2),
    "purchase_amount" DECIMAL(18,2),
    "remaining_quantity" DECIMAL(18,2),
    "distribution_shipment" DECIMAL(18,2),
    "consumable_amount" DECIMAL(18,2),
    "raw_row" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "metric" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DECIMAL(18,4),
    "window_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "alert_rule_id" TEXT,
    "report_date" DATE NOT NULL,
    "source_file_id" TEXT,
    "upload_batch_id" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metric_value" DECIMAL(18,4),
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_user_permissions_user_id_project_id_role_code_key" ON "project_user_permissions"("user_id", "project_id", "role_code");

-- CreateIndex
CREATE INDEX "finance_snapshots_project_id_report_month_idx" ON "finance_snapshots"("project_id", "report_month");

-- CreateIndex
CREATE INDEX "cashflow_snapshots_project_id_report_month_idx" ON "cashflow_snapshots"("project_id", "report_month");

-- CreateIndex
CREATE INDEX "balance_sheet_items_project_id_report_month_item_name_idx" ON "balance_sheet_items"("project_id", "report_month", "item_name");

-- CreateIndex
CREATE INDEX "profit_items_project_id_report_month_item_name_idx" ON "profit_items"("project_id", "report_month", "item_name");

-- CreateIndex
CREATE INDEX "receivable_payable_items_project_id_report_month_item_type_idx" ON "receivable_payable_items"("project_id", "report_month", "item_type");

-- CreateIndex
CREATE INDEX "payment_transactions_project_id_report_date_idx" ON "payment_transactions"("project_id", "report_date");

-- CreateIndex
CREATE INDEX "management_report_rows_project_id_report_month_channel_idx" ON "management_report_rows"("project_id", "report_month", "channel");

-- CreateIndex
CREATE INDEX "sales_daily_rows_project_id_report_date_channel_idx" ON "sales_daily_rows"("project_id", "report_date", "channel");

-- CreateIndex
CREATE INDEX "promotion_daily_rows_project_id_report_date_channel_idx" ON "promotion_daily_rows"("project_id", "report_date", "channel");

-- CreateIndex
CREATE INDEX "inventory_snapshots_project_id_report_date_idx" ON "inventory_snapshots"("project_id", "report_date");

-- CreateIndex
CREATE INDEX "inventory_sku_rows_project_id_report_date_sku_idx" ON "inventory_sku_rows"("project_id", "report_date", "sku");

-- CreateIndex
CREATE INDEX "purchase_rows_project_id_report_date_sap_code_idx" ON "purchase_rows"("project_id", "report_date", "sap_code");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_project_id_code_key" ON "alert_rules"("project_id", "code");

-- CreateIndex
CREATE INDEX "alert_events_project_id_status_severity_idx" ON "alert_events"("project_id", "status", "severity");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user_permissions" ADD CONSTRAINT "project_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user_permissions" ADD CONSTRAINT "project_user_permissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_files" ADD CONSTRAINT "source_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_files" ADD CONSTRAINT "source_files_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_snapshots" ADD CONSTRAINT "finance_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_snapshots" ADD CONSTRAINT "finance_snapshots_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_snapshots" ADD CONSTRAINT "cashflow_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_snapshots" ADD CONSTRAINT "cashflow_snapshots_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheet_items" ADD CONSTRAINT "balance_sheet_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheet_items" ADD CONSTRAINT "balance_sheet_items_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_items" ADD CONSTRAINT "profit_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_items" ADD CONSTRAINT "profit_items_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payable_items" ADD CONSTRAINT "receivable_payable_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payable_items" ADD CONSTRAINT "receivable_payable_items_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_report_rows" ADD CONSTRAINT "management_report_rows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_report_rows" ADD CONSTRAINT "management_report_rows_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily_rows" ADD CONSTRAINT "sales_daily_rows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily_rows" ADD CONSTRAINT "sales_daily_rows_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_daily_rows" ADD CONSTRAINT "promotion_daily_rows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_daily_rows" ADD CONSTRAINT "promotion_daily_rows_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sku_rows" ADD CONSTRAINT "inventory_sku_rows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sku_rows" ADD CONSTRAINT "inventory_sku_rows_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_rows" ADD CONSTRAINT "purchase_rows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_rows" ADD CONSTRAINT "purchase_rows_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "source_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

