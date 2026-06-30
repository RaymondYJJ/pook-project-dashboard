import { readFile } from "node:fs/promises";
import { inferProjectFromName, inferReportMonthFromName, todayUtcDate } from "@/lib/utils";
import { detectFormulaIssues, readWorkbook } from "@/lib/parsers/workbook";
import { emptyParsedFile, type ExcelParserType, type ParsedFile, type ParserType } from "@/lib/parsers/types";
import { parseFinance } from "@/lib/parsers/finance";
import { parseManagement } from "@/lib/parsers/management";
import { parseSales } from "@/lib/parsers/sales";
import { parsePromotion } from "@/lib/parsers/promotion";
import { parseInventory } from "@/lib/parsers/inventory";
import { parsePurchase } from "@/lib/parsers/purchase";

export function inferParserType(fileName: string, sheetNames: string[]): ParserType {
  if (/销售日报/.test(fileName)) return "sales";
  if (/推广/.test(fileName)) return "promotion";
  if (/商品日报|库存/.test(fileName)) return "inventory";
  if (/采购|台账/.test(fileName)) return "purchase";
  if (/管报|利润情况/.test(fileName)) return "management";
  if (/财报/.test(fileName) || sheetNames.some((name) => /资产负债表|现金流量表|支付明细/.test(name))) return "finance";
  if (/推广/.test(fileName) || sheetNames.some((name) => /营销场景|推广|复盘/.test(name))) return "promotion";
  if (/销售日报/.test(fileName) || sheetNames.some((name) => /销售数据源|日报/.test(name))) return "sales";
  if (/商品日报|库存|看板/.test(fileName) || sheetNames.some((name) => /总库存|京仓|现货率|不动销/.test(name))) return "inventory";
  if (/采购|台账/.test(fileName) || sheetNames.some((name) => /采购|台账/.test(name))) return "purchase";
  if (/管报|利润情况/.test(fileName) || sheetNames.some((name) => /项目看板|Sheet1/.test(name))) return "management";
  if (/html$/i.test(fileName)) return "html-dashboard";
  return "unknown";
}

export type ParseSourceOptions = {
  projectCode?: "taiyue" | "luxueya";
  parserType?: ExcelParserType;
  reportDate?: Date;
  reportMonth?: Date;
};

export async function parseSourceFile(filePath: string, originalName = filePath, options: ParseSourceOptions = {}): Promise<ParsedFile> {
  const buffer = await readFile(filePath);
  const projectCode = options.projectCode ?? inferProjectFromName(originalName);
  const reportMonth = options.reportMonth ?? inferReportMonthFromName(originalName);
  const reportDate = options.reportDate ?? todayUtcDate();

  if (/\.html?$/i.test(originalName)) {
    const parsed = emptyParsedFile({ parserType: "html-dashboard", projectCode, reportMonth, reportDate });
    parsed.summary.html = { note: "HTML 看板作为源文件留存，V1 不反向解析空表 DOM。" };
    return parsed;
  }

  const workbook = readWorkbook(buffer);
  const parserType = options.parserType ?? inferParserType(originalName, workbook.SheetNames);
  let parsed = emptyParsedFile({ parserType, projectCode, reportMonth, reportDate });
  parsed.qualityIssues.push(...detectFormulaIssues(workbook));

  if (parserType === "finance") parsed = parseFinance(workbook, parsed);
  if (parserType === "management") parsed = parseManagement(workbook, parsed);
  if (parserType === "sales") parsed = parseSales(workbook, parsed);
  if (parserType === "promotion") parsed = parsePromotion(workbook, parsed);
  if (parserType === "inventory") parsed = parseInventory(workbook, parsed);
  if (parserType === "purchase") parsed = parsePurchase(workbook, parsed);

  addParsedQualityChecks(parsed);
  parsed.summary.parserType = parserType;
  parsed.summary.projectCode = projectCode;
  parsed.summary.sheetNames = workbook.SheetNames;
  parsed.summary.qualityIssueCount = parsed.qualityIssues.length;
  return parsed;
}

function addParsedQualityChecks(parsed: ParsedFile) {
  const rowGroups = [
    ...parsed.managementReportRows,
    ...parsed.salesDailyRows,
    ...parsed.promotionDailyRows,
    ...parsed.inventorySkuRows,
    ...parsed.purchaseRows
  ];
  let emptyFieldCount = 0;
  for (const row of rowGroups) {
    const rawRow = row.rawRow;
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) continue;
    for (const [field, value] of Object.entries(rawRow)) {
      if (value === null || value === undefined || String(value).trim() === "") {
        emptyFieldCount += 1;
        if (emptyFieldCount <= 50) {
          parsed.qualityIssues.push({
            code: "EMPTY_FIELD",
            severity: "yellow",
            message: "源表存在空字段，确认入库前请检查是否为正常留空。",
            field
          });
        }
      }
    }
  }
  if (emptyFieldCount > 0) parsed.summary.emptyFieldCount = emptyFieldCount;

  const dateCounts = new Map<string, number>();
  for (const row of [...parsed.salesDailyRows, ...parsed.promotionDailyRows, ...parsed.inventorySkuRows, ...parsed.purchaseRows]) {
    const value = row.reportDate;
    if (!(value instanceof Date)) continue;
    const key = value.toISOString().slice(0, 10);
    dateCounts.set(key, (dateCounts.get(key) ?? 0) + 1);
  }
  for (const [date, count] of dateCounts) {
    if (count > 1) {
      parsed.qualityIssues.push({
        code: "DUPLICATE_DATE",
        severity: "orange",
        message: `源表中日期 ${date} 出现 ${count} 行，请确认是否为多渠道/多商品明细还是重复上传。`,
        value: date
      });
    }
  }
}

export type { ParsedFile, QualityIssue, ParserType, ExcelParserType } from "@/lib/parsers/types";
