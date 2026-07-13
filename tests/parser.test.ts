import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseSourceFile } from "@/lib/parsers";
import { parseFinance } from "@/lib/parsers/finance";
import { parsePromotion } from "@/lib/parsers/promotion";
import { parsePurchase } from "@/lib/parsers/purchase";
import { parseSales } from "@/lib/parsers/sales";
import { emptyParsedFile } from "@/lib/parsers/types";

const samples = path.join(process.cwd(), "sample-files");

describe("sample parsers", () => {
  it("parses finance report metrics", async () => {
    const result = await parseSourceFile(path.join(samples, "佰茶财报2026.05月.xlsx"), "佰茶财报2026.05月.xlsx");
    expect(result.parserType).toBe("finance");
    expect(result.projectCode).toBe("luxueya");
    expect(result.financeSnapshots.length).toBeGreaterThan(0);
    expect(result.balanceSheetItems.length).toBeGreaterThan(10);
    expect(result.paymentTransactions.length).toBeGreaterThanOrEqual(0);
  });

  it("parses management report rows", async () => {
    const result = await parseSourceFile(path.join(samples, "绿雪芽1-6月管报V2.xlsx"), "绿雪芽1-6月管报V2.xlsx");
    expect(result.parserType).toBe("management");
    expect(result.managementReportRows.length).toBeGreaterThan(0);
    expect(Number(result.summary.management && (result.summary.management as { rows: number }).rows)).toBeGreaterThan(0);
  });

  it("marks promotion formula errors as quality issues", async () => {
    const result = await parseSourceFile(path.join(samples, "太樾推广日报0622.xlsx"), "太樾推广日报0622.xlsx");
    expect(result.parserType).toBe("promotion");
    expect(result.qualityIssues.some((issue) => issue.code === "FORMULA_ERROR")).toBe(true);
  });

  it("parses inventory sku rows", async () => {
    const result = await parseSourceFile(path.join(samples, "绿雪芽-商品日报-6.22.xlsx"), "绿雪芽-商品日报-6.22.xlsx");
    expect(result.parserType).toBe("inventory");
    expect(result.inventorySkuRows.length).toBeGreaterThan(0);
    expect(result.inventorySnapshots.length).toBe(1);
  });

  it("parses fund flow workbook into finance and cashflow metrics", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["累计借金额", "1000", "累计贷金额", "2500"],
        ["对账单余额", "8000"]
      ]),
      "银行流水"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["店铺名称", "渠道", "科目", "期初余额", "本月收款", "本月付款", "本月提现收入", "本月提现支出", "期末余额（可用资金）"],
        ["银行流水", "银行存款", "", "5000", "2000", "1000", "300", "100", "6200"]
      ]),
      "资金收支情况一览"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["公司代码", "科目", "科目描述", "期末金额", "应付余额"],
        ["2240", "2202", "应付账款:商品采购", "-1200", "-1200"]
      ]),
      "SAP应付余额"
    );
    const parsed = parseFinance(workbook, emptyParsedFile({ parserType: "finance", projectCode: "luxueya", reportMonth: new Date("2026-06-01"), reportDate: new Date("2026-06-26") }));
    expect(parsed.financeSnapshots[0].endingCash).toBe(6200);
    expect(parsed.cashflowSnapshots[0].cashInflow).toBe(2300);
    expect(parsed.cashflowSnapshots[0].cashOutflow).toBe(1100);
    expect(parsed.receivablePayableItems.some((row) => row.itemType === "payable")).toBe(true);
  });

  it("parses undelivered purchase rows", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["序号", "采购oa", "SAP编码", "品名", "采购成本", "总订购数量", "总订购货值", "已提货数量", "已提货货值", "未提货数量", "未提货值", "未支付货款"],
        ["1", "CGSQ-1", "697", "金六条", "98.8", "1800", "177840", "840", "82992", "960", "94848", "1000"]
      ]),
      "Sheet1"
    );
    const parsed = parsePurchase(workbook, emptyParsedFile({ parserType: "purchase", projectCode: "luxueya", reportMonth: new Date("2026-06-01"), reportDate: new Date("2026-06-26") }));
    expect(parsed.purchaseRows).toHaveLength(1);
    expect(parsed.purchaseRows[0].remainingQuantity).toBe(960);
    expect(parsed.purchaseRows[0].consumableAmount).toBe(1000);
  });

  it("parses operation and customer service daily sales aliases", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["日期", "店铺名称", "访客数", "浏览量", "成交金额", "订单数", "客单价", "成交转化率"],
        ["2026-06-29", "绿雪芽天猫旗舰店", "1200", "3600", "58000", "320", "181.25", "26.67%"]
      ]),
      "天猫运营日报"
    );

    const parsed = parseSales(workbook, emptyParsedFile({ parserType: "sales", projectCode: "luxueya", reportMonth: new Date("2026-06-01"), reportDate: new Date("2026-06-29") }));

    expect(parsed.salesDailyRows).toHaveLength(1);
    expect(parsed.salesDailyRows[0].store).toBe("绿雪芽天猫旗舰店");
    expect(parsed.salesDailyRows[0].paymentAmount).toBe(58000);
    expect(parsed.salesDailyRows[0].paidBuyers).toBe(320);
    expect(parsed.salesDailyRows[0].conversionRate).toBeCloseTo(0.2667, 4);
  });

  it("parses promotion daily aliases from channel sheets", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["日期", "计划名称", "消耗", "曝光", "点击", "成交GMV", "投产比", "平均点击花费"],
        ["2026-06-29", "京东自营核心计划", "3600", "180000", "4200", "46800", "13", "0.86"]
      ]),
      "京东自营推广日报"
    );

    const parsed = parsePromotion(workbook, emptyParsedFile({ parserType: "promotion", projectCode: "luxueya", reportMonth: new Date("2026-06-01"), reportDate: new Date("2026-06-29") }));

    expect(parsed.promotionDailyRows).toHaveLength(1);
    expect(parsed.promotionDailyRows[0].campaign).toBe("京东自营核心计划");
    expect(parsed.promotionDailyRows[0].spend).toBe(3600);
    expect(parsed.promotionDailyRows[0].transactionAmount).toBe(46800);
    expect(parsed.promotionDailyRows[0].roi).toBe(13);
  });
});
