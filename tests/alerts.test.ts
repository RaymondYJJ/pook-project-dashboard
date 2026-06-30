import { describe, expect, it } from "vitest";
import { evaluateParsedFile } from "@/lib/alerts/engine";
import { emptyParsedFile } from "@/lib/parsers/types";

describe("alert engine", () => {
  it("creates data quality and inventory alerts", async () => {
    const parsed = emptyParsedFile({
      parserType: "inventory",
      projectCode: "luxueya",
      reportMonth: new Date("2026-06-01"),
      reportDate: new Date("2026-06-22")
    });
    parsed.qualityIssues.push({ code: "FORMULA_ERROR", severity: "red", message: "公式错误", sheet: "日报", cell: "E7" });
    parsed.inventorySkuRows.push({ sku: "SKU-1", productName: "测试商品", turnoverDays: 130, inventoryAmount: 20000, sales30d: 0 });
    const alerts = await evaluateParsedFile(parsed);
    expect(alerts.some((alert) => alert.code === "data_quality")).toBe(true);
    expect(alerts.some((alert) => alert.code === "sku_turnover_days_gt_120")).toBe(true);
    expect(alerts.some((alert) => alert.code === "sku_no_sales_30d")).toBe(true);
    expect(alerts.some((alert) => alert.alertType === "slow_moving" && alert.threshold === 120 && alert.suggestion)).toBe(true);
  });
});
