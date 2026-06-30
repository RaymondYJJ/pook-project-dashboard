import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma, type ProjectCode, type ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSourceFile, type ExcelParserType, type ParsedFile } from "@/lib/parsers";
import { alertReportDate, evaluateParsedFile } from "@/lib/alerts/engine";
import { parseDateValue } from "@/lib/parsers/workbook";
import { inferReportDateFromName, monthStart, todayUtcDate } from "@/lib/utils";

export type UploadPreview = {
  batchId?: string;
  sourceFileId?: string;
  fileName: string;
  projectCode: ProjectCode;
  reportType: ReportType;
  reportDate: string;
  reportMonth: string;
  version: number;
  sheets: string[];
  fields: string[];
  coreMetrics: Record<string, unknown>;
  rowCounts: Record<string, number>;
  anomalyCounts: Record<string, number>;
  anomalyFlags: {
    formulaErrors: boolean;
    refErrors: boolean;
    div0Errors: boolean;
    valueErrors: boolean;
    emptyFields: boolean;
    duplicateDates: boolean;
  };
  qualityIssueCount: number;
};

const reportTypes = new Set<ReportType>(["finance", "management", "sales", "promotion", "inventory", "purchase"]);

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

export async function createUploadPreview(input: {
  file: File;
  projectCode: ProjectCode;
  reportType: ReportType;
  reportDate: Date;
  userId?: string | null;
}) {
  const saved = await saveUploadedFile(input.file);
  const project = await prisma.project.findUnique({ where: { code: input.projectCode } });
  if (!project) throw new Error(`Project not seeded: ${input.projectCode}`);

  const reportMonth = monthStart(input.reportDate.getUTCFullYear(), input.reportDate.getUTCMonth() + 1);
  const version = await nextVersion(project.id, input.reportType, input.reportDate, reportMonth);
  const parsed = await parseSourceFile(saved.storagePath, input.file.name, {
    projectCode: input.projectCode,
    parserType: input.reportType as ExcelParserType,
    reportDate: input.reportDate,
    reportMonth
  });
  const preview = buildUploadPreview(parsed, input.file.name, input.reportType, version);

  const batch = await prisma.uploadBatch.create({
    data: {
      projectId: project.id,
      uploadedById: input.userId ?? undefined,
      reportType: input.reportType,
      reportDate: input.reportDate,
      reportMonth,
      version,
      status: "parsed",
      note: `Preview ${input.file.name}`,
      preview: toJson(preview)
    }
  });
  const sourceFile = await prisma.sourceFile.create({
    data: {
      projectId: project.id,
      uploadBatchId: batch.id,
      originalName: input.file.name,
      storagePath: saved.storagePath,
      fileType: path.extname(input.file.name).replace(".", "") || "unknown",
      parserType: parsed.parserType,
      reportType: input.reportType,
      reportDate: input.reportDate,
      reportMonth,
      checksum: saved.checksum,
      version,
      parseSummary: toJson(preview),
      qualityIssues: toJson(parsed.qualityIssues)
    }
  });
  const storedPreview = { ...preview, batchId: batch.id, sourceFileId: sourceFile.id };
  await prisma.uploadBatch.update({ where: { id: batch.id }, data: { preview: toJson(storedPreview) } });
  await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { parseSummary: toJson(storedPreview) } });
  return { batchId: batch.id, sourceFileId: sourceFile.id, preview: storedPreview };
}

export async function createAutoUploadPreview(input: {
  file: File;
  projectCode: ProjectCode;
  userId?: string | null;
}) {
  const saved = await saveUploadedFile(input.file);
  const project = await prisma.project.findUnique({ where: { code: input.projectCode } });
  if (!project) throw new Error(`Project not seeded: ${input.projectCode}`);

  const extension = path.extname(input.file.name).toLowerCase();
  if (extension === ".url") {
    return createExternalLinkPreview({ file: input.file, saved, projectId: project.id, projectCode: input.projectCode, userId: input.userId });
  }

  let parsed: ParsedFile;
  try {
    parsed = await parseSourceFile(saved.storagePath, input.file.name, { projectCode: input.projectCode });
  } catch (error) {
    return createFailedPreview({
      file: input.file,
      saved,
      projectId: project.id,
      projectCode: input.projectCode,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  const inferredType = toReportType(parsed.parserType);
  const reportDate = parsed.reportDate ?? inferReportDateFromName(input.file.name) ?? todayUtcDate();
  const reportMonth = parsed.reportMonth ?? monthStart(reportDate.getUTCFullYear(), reportDate.getUTCMonth() + 1);
  const version = inferredType ? await nextVersion(project.id, inferredType, reportDate, reportMonth) : 1;
  const preview = buildUploadPreview(parsed, input.file.name, inferredType, version);

  const batch = await prisma.uploadBatch.create({
    data: {
      projectId: project.id,
      uploadedById: input.userId ?? undefined,
      reportType: inferredType,
      reportDate,
      reportMonth,
      version,
      status: inferredType ? "parsed" : "pending",
      note: inferredType ? `Auto preview ${input.file.name}` : `Stored source file ${input.file.name}`,
      preview: toJson(preview)
    }
  });
  const sourceFile = await prisma.sourceFile.create({
    data: {
      projectId: project.id,
      uploadBatchId: batch.id,
      originalName: input.file.name,
      storagePath: saved.storagePath,
      fileType: extension.replace(".", "") || "unknown",
      parserType: parsed.parserType,
      reportType: inferredType,
      reportDate,
      reportMonth,
      checksum: saved.checksum,
      version,
      parseSummary: toJson(preview),
      qualityIssues: toJson(parsed.qualityIssues)
    }
  });
  const storedPreview = { ...preview, batchId: batch.id, sourceFileId: sourceFile.id };
  await prisma.uploadBatch.update({ where: { id: batch.id }, data: { preview: toJson(storedPreview) } });
  await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { parseSummary: toJson(storedPreview) } });
  return { batchId: batch.id, sourceFileId: sourceFile.id, preview: storedPreview };
}

async function createFailedPreview(input: {
  file: File;
  saved: { storagePath: string; checksum: string; size: number };
  projectId: string;
  projectCode: ProjectCode;
  userId?: string | null;
  message: string;
}) {
  const reportDate = inferReportDateFromName(input.file.name) ?? todayUtcDate();
  const reportMonth = monthStart(reportDate.getUTCFullYear(), reportDate.getUTCMonth() + 1);
  const preview = {
    fileName: input.file.name,
    projectCode: input.projectCode,
    reportType: "parse_failed",
    reportDate: reportDate.toISOString().slice(0, 10),
    reportMonth: reportMonth.toISOString().slice(0, 10),
    version: 1,
    sheets: [],
    fields: [],
    coreMetrics: { error: input.message },
    rowCounts: {},
    anomalyCounts: { PARSE_FAILED: 1 },
    anomalyFlags: { formulaErrors: false, refErrors: false, div0Errors: false, valueErrors: false, emptyFields: false, duplicateDates: false },
    qualityIssueCount: 1
  };
  const batch = await prisma.uploadBatch.create({
    data: {
      projectId: input.projectId,
      uploadedById: input.userId ?? undefined,
      reportDate,
      reportMonth,
      version: 1,
      status: "failed",
      note: `Parse failed ${input.file.name}`,
      preview: toJson(preview)
    }
  });
  const sourceFile = await prisma.sourceFile.create({
    data: {
      projectId: input.projectId,
      uploadBatchId: batch.id,
      originalName: input.file.name,
      storagePath: input.saved.storagePath,
      fileType: path.extname(input.file.name).replace(".", "") || "unknown",
      parserType: "parse-failed",
      reportDate,
      reportMonth,
      checksum: input.saved.checksum,
      version: 1,
      parseSummary: toJson(preview),
      qualityIssues: toJson([{ code: "PARSE_FAILED", severity: "red", message: input.message }])
    }
  });
  const storedPreview = { ...preview, batchId: batch.id, sourceFileId: sourceFile.id };
  await prisma.uploadBatch.update({ where: { id: batch.id }, data: { preview: toJson(storedPreview) } });
  await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { parseSummary: toJson(storedPreview) } });
  return { batchId: batch.id, sourceFileId: sourceFile.id, preview: storedPreview };
}

export async function confirmUploadBatch(batchId: string, userId?: string | null) {
  const batch = await prisma.uploadBatch.findUnique({ where: { id: batchId }, include: { sourceFiles: true, project: true } });
  if (!batch || !batch.projectId || !batch.reportType || !batch.reportDate || !batch.reportMonth) throw new Error("Upload batch is incomplete.");
  const sourceFile = batch.sourceFiles[0];
  if (!sourceFile) throw new Error("Upload batch has no source file.");
  const projectId = batch.projectId;
  const reportType = batch.reportType;
  const reportDate = batch.reportDate;
  const reportMonth = batch.reportMonth;

  const parsed = await parseSourceFile(sourceFile.storagePath, sourceFile.originalName, {
    projectCode: batch.project?.code ?? "luxueya",
    parserType: reportType as ExcelParserType,
    reportDate,
    reportMonth
  });

  await prisma.$transaction(async (tx) => {
    await clearImportedRows(tx, batch.id);
    await persistParsed(projectId, batch.id, sourceFile.id, parsed, tx);
    await tx.sourceFile.updateMany({
      where: {
        projectId,
        reportType,
        ...(usesMonth(reportType) ? { reportMonth } : { reportDate })
      },
      data: { isActiveVersion: false }
    });
    const now = new Date();
    await tx.sourceFile.update({
      where: { id: sourceFile.id },
      data: {
        isActiveVersion: true,
        confirmedAt: now,
        parseSummary: toJson(buildUploadPreview(parsed, sourceFile.originalName, reportType, sourceFile.version)),
        qualityIssues: toJson(parsed.qualityIssues)
      }
    });
    await tx.uploadBatch.update({
      where: { id: batch.id },
      data: { status: "imported", confirmedAt: now, activeAt: now, preview: toJson(buildUploadPreview(parsed, sourceFile.originalName, reportType, sourceFile.version)) }
    });
    await tx.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action: "upload.confirm",
        resource: "upload_batch",
        resourceId: batch.id,
        metadata: toJson({ sourceFileId: sourceFile.id, reportType, version: sourceFile.version })
      }
    });
  }, { timeout: 30000 });
  return { batchId: batch.id, sourceFileId: sourceFile.id };
}

export async function rollbackToUploadBatch(batchId: string, userId?: string | null) {
  const batch = await prisma.uploadBatch.findUnique({ where: { id: batchId }, include: { sourceFiles: true } });
  if (!batch || !batch.projectId || !batch.reportType || !batch.reportDate || !batch.reportMonth) throw new Error("Upload batch is incomplete.");
  if (batch.status !== "imported") throw new Error("Only imported batches can be activated.");
  const sourceFile = batch.sourceFiles[0];
  if (!sourceFile) throw new Error("Upload batch has no source file.");
  const projectId = batch.projectId;
  const reportType = batch.reportType;
  const reportDate = batch.reportDate;
  const reportMonth = batch.reportMonth;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.sourceFile.updateMany({
      where: {
        projectId,
        reportType,
        ...(usesMonth(reportType) ? { reportMonth } : { reportDate })
      },
      data: { isActiveVersion: false }
    });
    await tx.sourceFile.update({ where: { id: sourceFile.id }, data: { isActiveVersion: true } });
    await tx.uploadBatch.updateMany({
      where: {
        projectId,
        reportType,
        ...(usesMonth(reportType) ? { reportMonth } : { reportDate })
      },
      data: { activeAt: null }
    });
    await tx.uploadBatch.update({ where: { id: batch.id }, data: { activeAt: now } });
    await tx.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action: "upload.rollback",
        resource: "upload_batch",
        resourceId: batch.id,
        metadata: toJson({ sourceFileId: sourceFile.id, reportType, version: sourceFile.version })
      }
    });
  }, { timeout: 30000 });
}

export async function parseAndImportFile(filePath: string, originalName: string, userId?: string | null) {
  const parsed = await parseSourceFile(filePath, originalName);
  try {
    const project = await prisma.project.findUnique({ where: { code: parsed.projectCode } });
    if (!project) throw new Error(`Project not seeded: ${parsed.projectCode}`);
    const reportType = toReportType(parsed.parserType);
    const version = reportType ? await nextVersion(project.id, reportType, parsed.reportDate, parsed.reportMonth) : 1;
    const batch = await prisma.uploadBatch.create({
      data: {
        projectId: project.id,
        uploadedById: userId ?? undefined,
        reportType,
        reportDate: parsed.reportDate,
        reportMonth: parsed.reportMonth,
        version,
        status: "parsed",
        note: `Imported ${originalName}`,
        preview: toJson(reportType ? buildUploadPreview(parsed, originalName, reportType, version) : parsed.summary)
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
        reportType,
        reportDate: parsed.reportDate,
        reportMonth: parsed.reportMonth,
        version,
        parseSummary: toJson(parsed.summary),
        qualityIssues: toJson(parsed.qualityIssues)
      }
    });
    await persistParsed(project.id, batch.id, sourceFile.id, parsed);
    if (reportType) {
      await prisma.sourceFile.updateMany({
        where: {
          projectId: project.id,
          reportType,
          ...(usesMonth(reportType) ? { reportMonth: parsed.reportMonth } : { reportDate: parsed.reportDate })
        },
        data: { isActiveVersion: false }
      });
    }
    const now = new Date();
    await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { isActiveVersion: Boolean(reportType), confirmedAt: now } });
    await prisma.uploadBatch.update({ where: { id: batch.id }, data: { status: "imported", confirmedAt: now, activeAt: now } });
    return { parsed, batchId: batch.id, sourceFileId: sourceFile.id, imported: true };
  } catch (error) {
    return { parsed, imported: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function persistParsed(projectId: string, uploadBatchId: string, sourceFileId: string, parsed: ParsedFile, txClient?: Prisma.TransactionClient) {
  const reportMonth = parsed.reportMonth;
  const reportDate = parsed.reportDate;
  const runner = async (tx: Prisma.TransactionClient) => {
    await createManyChunked(tx.financeSnapshot, parsed.financeSnapshots.map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.cashflowSnapshot, parsed.cashflowSnapshots.map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.balanceSheetItem, parsed.balanceSheetItems.slice(0, 2000).map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.profitItem, parsed.profitItems.slice(0, 3000).map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.receivablePayableItem, parsed.receivablePayableItems.slice(0, 3000).map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.paymentTransaction, parsed.paymentTransactions.slice(0, 3000).map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    await createManyChunked(tx.managementReportRow, parsed.managementReportRows.slice(0, 5000).map((row) => attachMonth(row, projectId, sourceFileId, uploadBatchId, reportMonth)));
    await createManyChunked(tx.salesDailyRow, parsed.salesDailyRows.slice(0, 5000).map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    await createManyChunked(tx.promotionDailyRow, parsed.promotionDailyRows.slice(0, 5000).map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    await createManyChunked(tx.inventorySnapshot, parsed.inventorySnapshots.map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    await createManyChunked(tx.inventorySkuRow, parsed.inventorySkuRows.slice(0, 5000).map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    await createManyChunked(tx.purchaseRow, parsed.purchaseRows.slice(0, 5000).map((row) => attachDate(row, projectId, sourceFileId, uploadBatchId, reportDate)));
    const rules = await tx.alertRule.findMany({
      where: {
        isActive: true,
        OR: [{ projectId }, { projectId: null }]
      }
    });
    const alerts = await evaluateParsedFile(parsed, rules);
    await createManyChunked(
      tx.alertEvent,
      alerts.map((alert) => ({
        projectId,
        alertRuleId: alert.alertRuleId ?? undefined,
        reportDate: alertReportDate(),
        sourceFileId,
        uploadBatchId,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metric: alert.metric,
        metricValue: alert.metricValue ?? undefined,
        threshold: alert.threshold ?? undefined,
        reason: alert.reason,
        suggestion: alert.suggestion,
        sourceLabel: alert.sourceLabel,
        ownerName: alert.ownerName ?? undefined,
        payload: toJson(alert.payload ?? {})
      }))
    );
  };
  if (txClient) await runner(txClient);
  else await prisma.$transaction(runner, { timeout: 30000 });
}

async function createManyChunked(model: { createMany: (args: { data: any[] }) => Promise<unknown> }, rows: Record<string, unknown>[]) {
  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    if (chunk.length) await model.createMany({ data: chunk });
  }
}

async function clearImportedRows(tx: Prisma.TransactionClient, uploadBatchId: string) {
  await tx.alertEvent.deleteMany({ where: { uploadBatchId } });
  await tx.purchaseRow.deleteMany({ where: { uploadBatchId } });
  await tx.inventorySkuRow.deleteMany({ where: { uploadBatchId } });
  await tx.inventorySnapshot.deleteMany({ where: { uploadBatchId } });
  await tx.promotionDailyRow.deleteMany({ where: { uploadBatchId } });
  await tx.salesDailyRow.deleteMany({ where: { uploadBatchId } });
  await tx.managementReportRow.deleteMany({ where: { uploadBatchId } });
  await tx.paymentTransaction.deleteMany({ where: { uploadBatchId } });
  await tx.receivablePayableItem.deleteMany({ where: { uploadBatchId } });
  await tx.profitItem.deleteMany({ where: { uploadBatchId } });
  await tx.balanceSheetItem.deleteMany({ where: { uploadBatchId } });
  await tx.cashflowSnapshot.deleteMany({ where: { uploadBatchId } });
  await tx.financeSnapshot.deleteMany({ where: { uploadBatchId } });
}

async function nextVersion(projectId: string, reportType: ReportType, reportDate: Date, reportMonth: Date) {
  const latest = await prisma.sourceFile.findFirst({
    where: {
      projectId,
      reportType,
      ...(usesMonth(reportType) ? { reportMonth } : { reportDate })
    },
    orderBy: { version: "desc" }
  });
  return (latest?.version ?? 0) + 1;
}

function usesMonth(reportType: ReportType) {
  return reportType === "finance" || reportType === "management";
}

function toReportType(parserType: ParsedFile["parserType"]): ReportType | null {
  return reportTypes.has(parserType as ReportType) ? (parserType as ReportType) : null;
}

function buildUploadPreview(parsed: ParsedFile, fileName: string, reportType: ReportType | null, version: number): UploadPreview {
  const rowCounts = {
    financeSnapshots: parsed.financeSnapshots.length,
    cashflowSnapshots: parsed.cashflowSnapshots.length,
    balanceSheetItems: parsed.balanceSheetItems.length,
    profitItems: parsed.profitItems.length,
    receivablePayableItems: parsed.receivablePayableItems.length,
    paymentTransactions: parsed.paymentTransactions.length,
    managementReportRows: parsed.managementReportRows.length,
    salesDailyRows: parsed.salesDailyRows.length,
    promotionDailyRows: parsed.promotionDailyRows.length,
    inventorySnapshots: parsed.inventorySnapshots.length,
    inventorySkuRows: parsed.inventorySkuRows.length,
    purchaseRows: parsed.purchaseRows.length
  };
  const anomalyCounts = parsed.qualityIssues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.code] = (acc[issue.code] ?? 0) + 1;
    return acc;
  }, {});
  const issueText = parsed.qualityIssues.map((issue) => `${issue.code} ${issue.message} ${String(issue.value ?? "")}`).join(" ");
  return {
    fileName,
    projectCode: parsed.projectCode,
    reportType: reportType ?? "management",
    reportDate: parsed.reportDate.toISOString().slice(0, 10),
    reportMonth: parsed.reportMonth.toISOString().slice(0, 10),
    version,
    sheets: (parsed.summary.sheetNames as string[] | undefined) ?? [],
    fields: collectFields(parsed),
    coreMetrics: collectCoreMetrics(parsed),
    rowCounts,
    anomalyCounts,
    anomalyFlags: {
      formulaErrors: anomalyCounts.FORMULA_ERROR > 0,
      refErrors: issueText.includes("#REF!"),
      div0Errors: issueText.includes("#DIV/0!"),
      valueErrors: issueText.includes("#VALUE!"),
      emptyFields: anomalyCounts.EMPTY_FIELD > 0 || Number(parsed.summary.emptyFieldCount ?? 0) > 0,
      duplicateDates: anomalyCounts.DUPLICATE_DATE > 0
    },
    qualityIssueCount: parsed.qualityIssues.length
  };
}

async function createExternalLinkPreview(input: {
  file: File;
  saved: { storagePath: string; checksum: string; size: number };
  projectId: string;
  projectCode: ProjectCode;
  userId?: string | null;
}) {
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const content = buffer.toString("utf8");
  const url = content.match(/URL=(.+)/i)?.[1]?.trim() ?? content.match(/https?:\/\/\S+/)?.[0] ?? "";
  const reportDate = inferReportDateFromName(input.file.name) ?? todayUtcDate();
  const reportMonth = monthStart(reportDate.getUTCFullYear(), reportDate.getUTCMonth() + 1);
  const preview = {
    fileName: input.file.name,
    projectCode: input.projectCode,
    reportType: "external_link",
    reportDate: reportDate.toISOString().slice(0, 10),
    reportMonth: reportMonth.toISOString().slice(0, 10),
    version: 1,
    sheets: [],
    fields: ["url"],
    coreMetrics: { externalLink: url || "未识别到链接", note: "飞书快捷链接作为外部参考资料留存，不参与经营指标计算。" },
    rowCounts: {},
    anomalyCounts: url ? {} : { MISSING_EXTERNAL_URL: 1 },
    anomalyFlags: { formulaErrors: false, refErrors: false, div0Errors: false, valueErrors: false, emptyFields: !url, duplicateDates: false },
    qualityIssueCount: url ? 0 : 1
  };
  const batch = await prisma.uploadBatch.create({
    data: {
      projectId: input.projectId,
      uploadedById: input.userId ?? undefined,
      reportDate,
      reportMonth,
      version: 1,
      status: "parsed",
      note: `External link ${input.file.name}`,
      preview: toJson(preview)
    }
  });
  const sourceFile = await prisma.sourceFile.create({
    data: {
      projectId: input.projectId,
      uploadBatchId: batch.id,
      originalName: input.file.name,
      storagePath: input.saved.storagePath,
      fileType: "url",
      parserType: "external-link",
      reportDate,
      reportMonth,
      checksum: input.saved.checksum,
      version: 1,
      parseSummary: toJson(preview),
      qualityIssues: toJson(url ? [] : [{ code: "MISSING_EXTERNAL_URL", severity: "yellow", message: "未在 .url 文件中识别到可打开链接。" }])
    }
  });
  const storedPreview = { ...preview, batchId: batch.id, sourceFileId: sourceFile.id };
  await prisma.uploadBatch.update({ where: { id: batch.id }, data: { preview: toJson(storedPreview) } });
  await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { parseSummary: toJson(storedPreview) } });
  return { batchId: batch.id, sourceFileId: sourceFile.id, preview: storedPreview };
}

function collectFields(parsed: ParsedFile) {
  const fields = new Set<string>();
  for (const row of [
    ...parsed.balanceSheetItems,
    ...parsed.profitItems,
    ...parsed.receivablePayableItems,
    ...parsed.paymentTransactions,
    ...parsed.managementReportRows,
    ...parsed.salesDailyRows,
    ...parsed.promotionDailyRows,
    ...parsed.inventorySkuRows,
    ...parsed.purchaseRows
  ]) {
    for (const key of Object.keys(row.rawRow && typeof row.rawRow === "object" && !Array.isArray(row.rawRow) ? row.rawRow : row)) fields.add(key);
    if (fields.size >= 80) break;
  }
  return Array.from(fields).slice(0, 80);
}

function collectCoreMetrics(parsed: ParsedFile) {
  const metrics: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.summary)) {
    if (["sheetNames", "parserType", "projectCode", "qualityIssueCount"].includes(key)) continue;
    metrics[key] = value;
  }
  return metrics;
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
