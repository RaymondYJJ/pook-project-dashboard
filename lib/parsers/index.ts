import { readFile } from "node:fs/promises";
import { inferProjectFromName, inferReportMonthFromName, todayUtcDate } from "@/lib/utils";
import { detectFormulaIssues, readWorkbook } from "@/lib/parsers/workbook";
import { emptyParsedFile, type ParsedFile, type ParserType } from "@/lib/parsers/types";
import { parseFinance } from "@/lib/parsers/finance";
import { parseManagement } from "@/lib/parsers/management";
import { parseSales } from "@/lib/parsers/sales";
import { parsePromotion } from "@/lib/parsers/promotion";
import { parseInventory } from "@/lib/parsers/inventory";
import { parsePurchase } from "@/lib/parsers/purchase";

export function inferParserType(fileName: string, sheetNames: string[]): ParserType {
  if (/财报/.test(fileName) || sheetNames.some((name) => /资产负债表|现金流量表|支付明细/.test(name))) return "finance";
  if (/推广/.test(fileName) || sheetNames.some((name) => /营销场景|推广|复盘/.test(name))) return "promotion";
  if (/销售日报/.test(fileName) || sheetNames.some((name) => /销售数据源|日报/.test(name))) return "sales";
  if (/商品日报|库存|看板/.test(fileName) || sheetNames.some((name) => /总库存|京仓|现货率|不动销/.test(name))) return "inventory";
  if (/采购|台账/.test(fileName) || sheetNames.some((name) => /采购|台账/.test(name))) return "purchase";
  if (/管报|利润情况/.test(fileName) || sheetNames.some((name) => /项目看板|Sheet1/.test(name))) return "management";
  if (/html$/i.test(fileName)) return "html-dashboard";
  return "unknown";
}

export async function parseSourceFile(filePath: string, originalName = filePath): Promise<ParsedFile> {
  const buffer = await readFile(filePath);
  const projectCode = inferProjectFromName(originalName);
  const reportMonth = inferReportMonthFromName(originalName);
  const reportDate = todayUtcDate();

  if (/\.html?$/i.test(originalName)) {
    const parsed = emptyParsedFile({ parserType: "html-dashboard", projectCode, reportMonth, reportDate });
    parsed.summary.html = { note: "HTML 看板作为源文件留存，V1 不反向解析空表 DOM。" };
    return parsed;
  }

  const workbook = readWorkbook(buffer);
  const parserType = inferParserType(originalName, workbook.SheetNames);
  let parsed = emptyParsedFile({ parserType, projectCode, reportMonth, reportDate });
  parsed.qualityIssues.push(...detectFormulaIssues(workbook));

  if (parserType === "finance") parsed = parseFinance(workbook, parsed);
  if (parserType === "management") parsed = parseManagement(workbook, parsed);
  if (parserType === "sales") parsed = parseSales(workbook, parsed);
  if (parserType === "promotion") parsed = parsePromotion(workbook, parsed);
  if (parserType === "inventory") parsed = parseInventory(workbook, parsed);
  if (parserType === "purchase") parsed = parsePurchase(workbook, parsed);

  parsed.summary.parserType = parserType;
  parsed.summary.projectCode = projectCode;
  parsed.summary.sheetNames = workbook.SheetNames;
  parsed.summary.qualityIssueCount = parsed.qualityIssues.length;
  return parsed;
}

export type { ParsedFile, QualityIssue, ParserType } from "@/lib/parsers/types";
