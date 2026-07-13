import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, parseDateValue, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

const promotionHeaderKeywords = ["日期", "花费", "消耗", "展现", "曝光", "点击", "ROI", "投产比", "成交", "GMV"];

const dateAliases = ["日期", "统计日期", "时间"];
const channelAliases = ["渠道汇总", "渠道名", "渠道", "平台", "媒体", "场景名字"];
const campaignAliases = ["场景名字", "主体名称", "产品名称", "计划名称", "推广计划", "单元名称"];
const spendAliases = ["花费", "消耗", "推广花费", "广告花费", "总花费"];
const impressionAliases = ["展现量", "展现", "曝光量", "曝光"];
const clickAliases = ["点击量", "点击"];
const transactionAliases = ["总成交金额", "成交金额", "成交GMV", "成交订单金额", "销售额", "直接成交金额"];
const roiAliases = ["roi", "ROI", "投产比"];
const cpcAliases = ["CPC", "平均点击花费"];
const clickRateAliases = ["点击率", "CTR"];
const conversionAliases = ["转化率", "CVR", "成交转化率", "点击转化率"];
const cartCostAliases = ["加购成本", "收藏加购成本"];

function inferChannelFromSheet(sheetName: string) {
  return sheetName.match(/天猫|京东POP|京东自营|京东|抖音|小红书|微店|微信小店|POP|线下/)?.[0] ?? null;
}

function hasPromotionSignal(row: Record<string, unknown>) {
  return [
    rowNumber(row, spendAliases),
    rowNumber(row, impressionAliases),
    rowNumber(row, clickAliases),
    rowNumber(row, transactionAliases),
    rowNumber(row, roiAliases),
    rowNumber(row, cpcAliases)
  ].some((value) => value !== null);
}

export function parsePromotion(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    if (!/(营销场景数据源|商品数据源|复盘|推广|日报)/.test(sheetName)) continue;
    let rows: unknown[][];
    try {
      rows = sheetRows(workbook, sheetName, 140);
    } catch (error) {
      parsed.qualityIssues.push({
        code: "SHEET_PARSE_ERROR",
        severity: "yellow",
        message: `无法读取推广 sheet：${error instanceof Error ? error.message : String(error)}`,
        sheet: sheetName
      });
      continue;
    }
    const headerIndex = findHeaderRow(rows, promotionHeaderKeywords);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 12000)) {
      if (!hasPromotionSignal(row)) continue;
      const spend = rowNumber(row, spendAliases);
      const roi = rowNumber(row, roiAliases);
      const qualityIssue = Object.values(row).some((value) => /#REF!|#DIV\/0!|#VALUE!|#N\/A/.test(String(value ?? "")))
        ? "公式错误"
        : null;
      parsed.promotionDailyRows.push({
        reportDate: parseDateValue(rowValue(row, dateAliases), parsed.reportDate),
        channel: rowValue(row, channelAliases) ?? inferChannelFromSheet(sheetName),
        campaign: rowValue(row, campaignAliases),
        spend,
        impressions: rowNumber(row, impressionAliases),
        clicks: rowNumber(row, clickAliases),
        transactionAmount: rowNumber(row, transactionAliases),
        roi,
        cpc: rowNumber(row, cpcAliases),
        clickRate: rowNumber(row, clickRateAliases),
        conversionRate: rowNumber(row, conversionAliases),
        cartCost: rowNumber(row, cartCostAliases),
        isValid: !qualityIssue,
        qualityIssue,
        rawRow: row
      });
    }
  }
  parsed.summary.promotion = {
    rows: parsed.promotionDailyRows.length,
    invalidRows: parsed.promotionDailyRows.filter((row) => !row.isValid).length,
    spend: parsed.promotionDailyRows.reduce((sum, row) => sum + (parseNumber(row.spend) ?? 0), 0)
  };
  return parsed;
}

export const promotionDailyParser = parsePromotion;
