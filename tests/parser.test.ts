import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSourceFile } from "@/lib/parsers";

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
});
