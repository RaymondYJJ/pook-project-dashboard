import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parseManagement(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  const sheetName = workbook.SheetNames.find((name) => /Sheet1|数据|明细/i.test(name)) ?? workbook.SheetNames[0];
  const rows = sheetRows(workbook, sheetName, 120);
  const headerIndex = findHeaderRow(rows, ["月份", "GMV", "销售出库", "销售成本", "项目", "店铺"]);
  if (headerIndex < 0) {
    parsed.qualityIssues.push({ code: "MISSING_HEADER", severity: "orange", message: "未识别到管报明细表头。", sheet: sheetName });
    return parsed;
  }
  const objects = sheetObjects(workbook, sheetName, headerIndex, 20000);
  const moneyMultiplier = inferMoneyMultiplier(objects, parsed.projectCode);
  for (const row of objects) {
    if (!rowValue(row, ["月份", "日期"]) && !rowValue(row, ["项目", "项目名称"])) continue;
    const gmv = money(rowNumber(row, ["GMV"]), moneyMultiplier);
    const salesOutbound = money(rowNumber(row, ["销售出库"]), moneyMultiplier);
    const projectProfit = money(rowNumber(row, ["项目利润", "净利润"]), moneyMultiplier);
    parsed.managementReportRows.push({
      company: rowValue(row, ["公司名称", "公司"]),
      profitCenter: rowValue(row, ["利润中心名称", "利润中心", "利润中心编码"]),
      store: rowValue(row, ["店铺"]),
      channel: rowValue(row, ["渠道", "业务模块"]),
      gmv,
      gsv: money(rowNumber(row, ["GSV"]), moneyMultiplier),
      refundRate: rowNumber(row, ["退款率"]),
      salesOutbound,
      salesCost: money(rowNumber(row, ["销售成本"]), moneyMultiplier),
      purchaseSalesDiff: money(rowNumber(row, ["进销差"]), moneyMultiplier),
      adSpend: money(rowNumber(row, ["投放费用", "直播推广费"]), moneyMultiplier),
      platformFees: money(rowNumber(row, ["扣点佣金", "平台扣点"]), moneyMultiplier),
      promotionFees: money(rowNumber(row, ["促销推广费"]), moneyMultiplier),
      staffFees: money(rowNumber(row, ["人员费用", "人力费用"]), moneyMultiplier),
      projectProfit,
      profitRate: rowNumber(row, ["利润率"]),
      rawRow: row
    });
  }
  parsed.summary.management = {
    rows: parsed.managementReportRows.length,
    gmv: parsed.managementReportRows.reduce((sum, row) => sum + (Number(row.gmv) || 0), 0),
    projectProfit: parsed.managementReportRows.reduce((sum, row) => sum + (Number(row.projectProfit) || 0), 0)
  };
  return parsed;
}

function money(value: number | null, multiplier: number) {
  return value === null ? null : value * multiplier;
}

function inferMoneyMultiplier(rows: Record<string, unknown>[], projectCode: ParsedFile["projectCode"]) {
  if (projectCode !== "taiyue") return 1;
  const values = rows.map((row) => rowNumber(row, ["GMV"])).filter((value): value is number => value !== null && Math.abs(value) > 0);
  if (!values.length) return 1;
  const sorted = values.slice().sort((a, b) => Math.abs(a) - Math.abs(b));
  const median = Math.abs(sorted[Math.floor(sorted.length / 2)]);
  return median < 10000 ? 10000 : 1;
}

export const managementReportParser = parseManagement;
