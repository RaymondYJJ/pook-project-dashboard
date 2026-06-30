import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, parseDateValue, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parseSales(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    if (!/(销售数据源|日报|销量明细|店铺)/.test(sheetName)) continue;
    const rows = sheetRows(workbook, sheetName, 80);
    const headerIndex = findHeaderRow(rows, ["日期", "付款金额", "支付", "访客", "浏览", "商品"]);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 15000)) {
      const date = parseDateValue(rowValue(row, ["日期", "付款时间", "出库时间", "下单时间"]), parsed.reportDate);
      parsed.salesDailyRows.push({
        reportDate: date,
        channel: rowValue(row, ["平台类型", "渠道"]),
        store: rowValue(row, ["客户名称", "店铺"]),
        productName: rowValue(row, ["商品名称", "产品名称"]),
        sku: rowValue(row, ["SKU", "商品代码", "商品货号"]),
        paymentAmount: rowNumber(row, ["付款金额", "支付金额"]),
        actualSales: rowNumber(row, ["实际销售", "小计", "消耗货值"]),
        gmvTarget: rowNumber(row, ["GMV目标", "目标"]),
        completionRate: rowNumber(row, ["达成率"]),
        paidUnits: rowNumber(row, ["支付件数", "商品数量", "件数"]),
        paidBuyers: rowNumber(row, ["支付买家数", "买家数"]),
        visitors: rowNumber(row, ["访客数", "访客"]),
        pageViews: rowNumber(row, ["浏览量", "PV"]),
        conversionRate: rowNumber(row, ["转化率"]),
        averageOrderValue: rowNumber(row, ["客单价"]),
        rawRow: row
      });
    }
  }
  parsed.summary.sales = {
    rows: parsed.salesDailyRows.length,
    paymentAmount: parsed.salesDailyRows.reduce((sum, row) => sum + (parseNumber(row.paymentAmount) ?? 0), 0)
  };
  return parsed;
}

export const salesDailyParser = parseSales;
