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
  for (const row of objects) {
    if (!rowValue(row, ["月份", "日期"]) && !rowValue(row, ["项目", "项目名称"])) continue;
    const gmv = rowNumber(row, ["GMV"]);
    const salesOutbound = rowNumber(row, ["销售出库"]);
    const projectProfit = rowNumber(row, ["项目利润", "净利润"]);
    parsed.managementReportRows.push({
      company: rowValue(row, ["公司名称", "公司"]),
      profitCenter: rowValue(row, ["利润中心名称", "利润中心", "利润中心编码"]),
      store: rowValue(row, ["店铺"]),
      channel: rowValue(row, ["渠道", "业务模块"]),
      gmv,
      gsv: rowNumber(row, ["GSV"]),
      refundRate: rowNumber(row, ["退款率"]),
      salesOutbound,
      salesCost: rowNumber(row, ["销售成本"]),
      purchaseSalesDiff: rowNumber(row, ["进销差"]),
      adSpend: rowNumber(row, ["投放费用", "直播推广费"]),
      platformFees: rowNumber(row, ["扣点佣金", "平台扣点"]),
      promotionFees: rowNumber(row, ["促销推广费"]),
      staffFees: rowNumber(row, ["人员费用", "人力费用"]),
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

export const managementReportParser = parseManagement;
