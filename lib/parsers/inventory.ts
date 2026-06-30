import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parseInventory(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    if (!/(总库存|库存|京仓|不动销|现货率|福鼎总表)/.test(sheetName)) continue;
    const rows = sheetRows(workbook, sheetName, 100);
    const headerIndex = findHeaderRow(rows, ["商品", "SKU", "库存", "在途", "仓库", "销售"]);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 10000)) {
      const productName = rowValue(row, ["商品名称", "商品"]);
      const sku = rowValue(row, ["SKU", "商品货号", "商品编号"]);
      if (!productName && !sku) continue;
      parsed.inventorySkuRows.push({
        sku,
        productName,
        warehouse: rowValue(row, ["仓库", "配送中心"]),
        inventoryQuantity: rowNumber(row, ["在库库存", "当前库存", "可用库存", "库存"]),
        inventoryAmount: rowNumber(row, ["库存金额", "库存货值", "全国库存金额"]),
        sales7d: rowNumber(row, ["近7", "7日销售"]),
        sales30d: rowNumber(row, ["近30", "30日销售"]),
        turnoverDays: rowNumber(row, ["周转天数", "库存天数", "可售天数"]),
        inTransit: rowNumber(row, ["在途库存", "采购在途", "在途"]),
        isDefective: /残次/.test(sheetName),
        rawRow: row
      });
    }
  }
  const inventoryAmount = parsed.inventorySkuRows.reduce((sum, row) => sum + (parseNumber(row.inventoryAmount) ?? 0), 0);
  const inventoryQuantity = parsed.inventorySkuRows.reduce((sum, row) => sum + (parseNumber(row.inventoryQuantity) ?? 0), 0);
  const lowStockSkuCount = parsed.inventorySkuRows.filter((row) => {
    const days = parseNumber(row.turnoverDays);
    return days !== null && days < 14;
  }).length;
  parsed.inventorySnapshots.push({
    inventoryAmount,
    inventoryQuantity,
    turnoverDays: average(parsed.inventorySkuRows.map((row) => parseNumber(row.turnoverDays))),
    slowMovingAmount: parsed.inventorySkuRows
      .filter((row) => (parseNumber(row.turnoverDays) ?? 0) > 120)
      .reduce((sum, row) => sum + (parseNumber(row.inventoryAmount) ?? 0), 0),
    lowStockSkuCount,
    inTransitAmount: parsed.inventorySkuRows.reduce((sum, row) => sum + (parseNumber(row.inTransit) ?? 0), 0),
    rawMetrics: { skuRows: parsed.inventorySkuRows.length }
  });
  parsed.summary.inventory = { skuRows: parsed.inventorySkuRows.length, inventoryAmount, lowStockSkuCount };
  return parsed;
}

export const inventoryDailyParser = parseInventory;

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
