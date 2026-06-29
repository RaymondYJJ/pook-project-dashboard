import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSourceFile, type ParsedFile } from "@/lib/parsers";
import { alertReportDate, evaluateParsedFile } from "@/lib/alerts/engine";
import { parseDateValue } from "@/lib/parsers/workbook";
import { todayUtcDate } from "@/lib/utils";

export async function saveUploadedFile(file: File) {
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeName = `${Date.now()}-${file.name.replace(/[\\/]/g, "_")}`;
  const storagePath = path.join(uploadDir, safeName);
  await writeFile(storagePath, buffer);
  return { storagePath, checksum, size: buffer.length };
}

export async function parseAndImportFile(filePath: string, originalName: string, userId?: string | null) {
  const parsed = await parseSourceFile(filePath, originalName);
  try {
    const project = await prisma.project.findUnique({ where: { code: parsed.projectCode } });
    if (!project) throw new Error(`Project not seeded: ${parsed.projectCode}`);
    const batch = await prisma.uploadBatch.create({
      data: {
        projectId: project.id,
        uploadedById: userId ?? undefined,
        status: "parsed",
        note: `Imported ${originalName}`
      }
    });
    const sourceFile = await prisma.sourceFile.create({
      data: {
        projectId: project.id,
        uploadBatchId: batch.id,
        originalName,
        storagePath: filePath,
        fileType: path.extname(originalName).replace(".", "") || "unknown",
        parserType: parsed.parserType,
        parseSummary: toJson(parsed.summary),
        qualityIssues: toJson(parsed.qualityIssues)
      }
    });
    await persistParsed(project.id, batch.id, sourceFile.id, parsed);
    await prisma.uploadBatch.update({ where: { id: batch.id }, data: { status: "imported" } });
    return { parsed, batchId: batch.id, sourceFileId: sourceFile.id, imported: true };
  } catch (error) {
    return { parsed, imported: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function persistParsed(projectId: string, uploadBatchId: string, sourceFileId: string, parsed: ParsedFile) {
  const reportMonth = parsed.reportMonth;
  const reportDate = parsed.reportDate;
  await prisma.$transaction(async (tx) => {
    for (const row of parsed.financeSnapshots) {
      await tx.financeSnapshot.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.FinanceSnapshotUncheckedCreateInput });
    }
    for (const row of parsed.cashflowSnapshots) {
      await tx.cashflowSnapshot.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.CashflowSnapshotUncheckedCreateInput });
    }
    for (const row of parsed.balanceSheetItems.slice(0, 2000)) {
      await tx.balanceSheetItem.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.BalanceSheetItemUncheckedCreateInput });
    }
    for (const row of parsed.profitItems.slice(0, 3000)) {
      await tx.profitItem.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.ProfitItemUncheckedCreateInput });
    }
    for (const row of parsed.receivablePayableItems.slice(0, 3000)) {
      await tx.receivablePayableItem.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.ReceivablePayableItemUncheckedCreateInput });
    }
    for (const row of parsed.paymentTransactions.slice(0, 3000)) {
      await tx.paymentTransaction.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.PaymentTransactionUncheckedCreateInput });
    }
    for (const row of parsed.managementReportRows.slice(0, 5000)) {
      await tx.managementReportRow.create({ data: attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth) as Prisma.ManagementReportRowUncheckedCreateInput });
    }
    for (const row of parsed.salesDailyRows.slice(0, 5000)) {
      await tx.salesDailyRow.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.SalesDailyRowUncheckedCreateInput });
    }
    for (const row of parsed.promotionDailyRows.slice(0, 5000)) {
      await tx.promotionDailyRow.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.PromotionDailyRowUncheckedCreateInput });
    }
    for (const row of parsed.inventorySnapshots) {
      await tx.inventorySnapshot.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.InventorySnapshotUncheckedCreateInput });
    }
    for (const row of parsed.inventorySkuRows.slice(0, 5000)) {
      await tx.inventorySkuRow.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.InventorySkuRowUncheckedCreateInput });
    }
    for (const row of parsed.purchaseRows.slice(0, 5000)) {
      await tx.purchaseRow.create({ data: attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate) as Prisma.PurchaseRowUncheckedCreateInput });
    }
    for (const alert of evaluateParsedFile(parsed)) {
      await tx.alertEvent.create({
        data: {
          projectId,
          reportDate: alertReportDate(),
          sourceFileId,
          uploadBatchId,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metricValue: alert.metricValue ?? undefined,
          payload: toJson(alert.payload ?? {})
        }
      });
    }
  });
}

function cleanRow(row: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (key === "reportDate" || key === "reportMonth") continue;
    cleaned[key] = key === "rawRow" || key === "rawMetrics" ? toJson(value) : value;
  }
  return cleaned;
}

function attachMonth(row: Record<string, unknown>, projectId: string, sourceFileId: string, uploadBatchId: string, fallback: Date) {
  return {
    ...cleanRow(row),
    projectId,
    sourceFileId,
    uploadBatchId,
    reportMonth: row.reportMonth instanceof Date ? row.reportMonth : fallback
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function attachDate(row: Record<string, unknown>, projectId: string, sourceFileId: string, uploadBatchId: string, fallback: Date) {
  return {
    ...cleanRow(row),
    projectId,
    sourceFileId,
    uploadBatchId,
    reportDate: parseDateValue(row.reportDate, fallback) ?? todayUtcDate()
  };
}
