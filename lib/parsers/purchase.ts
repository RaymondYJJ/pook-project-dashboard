import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, parseDateValue, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parsePurchase(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    const rows = sheetRows(workbook, sheetName, 100);
    const headerIndex = findHeaderRow(rows, ["采购", "SAP", "物料", "品名", "数量", "入库", "余量", "未提货", "已提货"]);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 10000)) {
      const materialName = rowValue(row, ["物料名称", "商品名称", "品名"]);
      if (!materialName && !rowValue(row, ["采购OA", "采购/需求单号"])) continue;
      parsed.purchaseRows.push({
        reportDate: parseDateValue(rowValue(row, ["时间", "日期", "变动时间"]), parsed.reportDate),
        purchaseOa: rowValue(row, ["采购OA", "采购/需求单号", "原单据号"]),
        sapCode: rowValue(row, ["SAP编码", "商品货号", "商品编号"]),
        materialName,
        unitPrice: rowNumber(row, ["采购单价", "采购成本", "含税成本价", "单价"]),
        purchaseQuantity: rowNumber(row, ["采购数量", "总订购数量", "采购/需求数量"]),
        actualInbound: rowNumber(row, ["实际入库", "已入库", "已提货数量", "库存变动数"]),
        purchaseAmount: rowNumber(row, ["采购额", "采购金额", "总订购货值", "到货含税金额"]),
        remainingQuantity: rowNumber(row, ["余量", "未提货数量", "在途"]),
        distributionShipment: rowNumber(row, ["分销发货"]),
        consumableAmount: rowNumber(row, ["耗材采购", "未支付货款", "未提货值"]),
        rawRow: row
      });
    }
  }
  if (!parsed.purchaseRows.length) {
    parsed.qualityIssues.push({ code: "EMPTY_PURCHASE_LEDGER", severity: "yellow", message: "采购台账样本未识别到有效采购明细。", sheet: workbook.SheetNames.join(", ") });
  }
  parsed.summary.purchase = { rows: parsed.purchaseRows.length };
  return parsed;
}

export const purchaseLedgerParser = parsePurchase;
