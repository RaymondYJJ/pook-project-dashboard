import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, parseDateValue, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parsePromotion(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    if (!/(营销场景数据源|商品数据源|复盘|推广|日报)/.test(sheetName)) continue;
    const rows = sheetRows(workbook, sheetName, 140);
    const headerIndex = findHeaderRow(rows, ["日期", "花费", "展现", "点击", "ROI", "成交"]);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 12000)) {
      const spend = rowNumber(row, ["花费"]);
      const roi = rowNumber(row, ["roi", "ROI"]);
      const qualityIssue = Object.values(row).some((value) => /#REF!|#DIV\/0!|#VALUE!|#N\/A/.test(String(value ?? "")))
        ? "公式错误"
        : null;
      parsed.promotionDailyRows.push({
        reportDate: parseDateValue(rowValue(row, ["日期"]), parsed.reportDate),
        channel: rowValue(row, ["渠道汇总", "渠道名", "渠道", "场景名字"]),
        campaign: rowValue(row, ["场景名字", "主体名称", "产品名称"]),
        spend,
        impressions: rowNumber(row, ["展现量", "展现"]),
        clicks: rowNumber(row, ["点击量", "点击"]),
        transactionAmount: rowNumber(row, ["总成交金额", "成交金额"]),
        roi,
        cpc: rowNumber(row, ["CPC", "平均点击花费"]),
        clickRate: rowNumber(row, ["点击率"]),
        conversionRate: rowNumber(row, ["转化率", "点击转化率"]),
        cartCost: rowNumber(row, ["加购成本"]),
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
