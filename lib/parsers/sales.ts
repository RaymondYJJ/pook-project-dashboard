import { parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findHeaderRow, parseDateValue, rowNumber, rowValue, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

const salesHeaderKeywords = ["日期", "付款金额", "支付", "访客", "浏览", "商品", "成交", "销售额", "订单", "客单价", "转化率"];

const dateAliases = ["日期", "统计日期", "时间", "付款时间", "出库时间", "下单时间"];
const channelAliases = ["平台类型", "渠道", "渠道汇总", "平台", "来源"];
const storeAliases = ["客户名称", "店铺", "店铺名称", "账号", "账号名称", "门店"];
const productAliases = ["商品名称", "产品名称", "品名"];
const skuAliases = ["SKU", "SKU编码", "商品代码", "商品货号", "商品编号"];
const paymentAliases = ["付款金额", "支付金额", "成交金额", "销售额", "GMV", "支付GMV"];
const actualSalesAliases = ["实际销售", "小计", "消耗货值", "GSV", "销售出库", "成交金额"];
const targetAliases = ["GMV目标", "目标", "销售目标"];
const completionAliases = ["达成率", "完成率", "目标完成率"];
const unitsAliases = ["支付件数", "商品数量", "件数", "成交件数", "销量", "销售数量", "订单商品数"];
const buyersAliases = ["支付买家数", "买家数", "成交人数", "成交买家数", "下单人数", "订单数"];
const visitorAliases = ["访客数", "访客", "UV", "店铺访客数"];
const pageViewAliases = ["浏览量", "PV", "浏览", "曝光"];
const conversionAliases = ["转化率", "支付转化率", "成交转化率", "询单转化率"];
const averageOrderAliases = ["客单价", "支付客单价", "成交客单价"];

function inferChannelFromSheet(sheetName: string) {
  return sheetName.match(/天猫|京东POP|京东自营|京东|抖音|小红书|微店|微信小店|POP|线下/)?.[0] ?? null;
}

function hasSalesSignal(row: Record<string, unknown>) {
  const numericValues = [
    rowNumber(row, paymentAliases),
    rowNumber(row, actualSalesAliases),
    rowNumber(row, targetAliases),
    rowNumber(row, unitsAliases),
    rowNumber(row, buyersAliases),
    rowNumber(row, visitorAliases),
    rowNumber(row, pageViewAliases),
    rowNumber(row, conversionAliases),
    rowNumber(row, averageOrderAliases)
  ];
  return numericValues.some((value) => value !== null) || Boolean(rowValue(row, productAliases) || rowValue(row, skuAliases));
}

export function parseSales(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  for (const sheetName of workbook.SheetNames) {
    if (!/(销售数据源|日报|销量明细|店铺)/.test(sheetName)) continue;
    let rows: unknown[][];
    try {
      rows = sheetRows(workbook, sheetName, 100);
    } catch (error) {
      parsed.qualityIssues.push({
        code: "SHEET_PARSE_ERROR",
        severity: "yellow",
        message: `无法读取销售 sheet：${error instanceof Error ? error.message : String(error)}`,
        sheet: sheetName
      });
      continue;
    }
    const headerIndex = findHeaderRow(rows, salesHeaderKeywords);
    if (headerIndex < 0) continue;
    for (const row of sheetObjects(workbook, sheetName, headerIndex, 15000)) {
      if (!hasSalesSignal(row)) continue;
      const date = parseDateValue(rowValue(row, dateAliases), parsed.reportDate);
      parsed.salesDailyRows.push({
        reportDate: date,
        channel: rowValue(row, channelAliases) ?? inferChannelFromSheet(sheetName),
        store: rowValue(row, storeAliases),
        productName: rowValue(row, productAliases),
        sku: rowValue(row, skuAliases),
        paymentAmount: rowNumber(row, paymentAliases),
        actualSales: rowNumber(row, actualSalesAliases),
        gmvTarget: rowNumber(row, targetAliases),
        completionRate: rowNumber(row, completionAliases),
        paidUnits: rowNumber(row, unitsAliases),
        paidBuyers: rowNumber(row, buyersAliases),
        visitors: rowNumber(row, visitorAliases),
        pageViews: rowNumber(row, pageViewAliases),
        conversionRate: rowNumber(row, conversionAliases),
        averageOrderValue: rowNumber(row, averageOrderAliases),
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
