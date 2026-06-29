import path from "node:path";
import { readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSourceFile } from "@/lib/parsers";

describe("sample import dry run", () => {
  it("dry-runs all uploaded sample files", async () => {
    const sampleDir = path.join(process.cwd(), "sample-files");
    const files = (await readdir(sampleDir)).filter((file) => /\.(xlsx|html?)$/i.test(file));
    const results = [];
    for (const file of files) {
      results.push(await parseSourceFile(path.join(sampleDir, file), file));
    }
    expect(files).toHaveLength(11);
    expect(results.every((result) => result.parserType !== "unknown")).toBe(true);
    expect(results.every((result) => result.projectCode === "taiyue" || result.projectCode === "luxueya")).toBe(true);
    expect(results.filter((result) => result.parserType === "finance").length).toBeGreaterThanOrEqual(2);
    expect(results.filter((result) => result.parserType === "management").length).toBeGreaterThanOrEqual(2);
    expect(results.filter((result) => result.parserType === "inventory").length).toBeGreaterThanOrEqual(1);
    expect(results.some((result) => result.parserType === "sales" && result.salesDailyRows.length > 0)).toBe(true);
    expect(results.some((result) => result.parserType === "promotion" && result.promotionDailyRows.length > 0)).toBe(true);
    expect(results.some((result) => result.parserType === "purchase" && result.purchaseRows.length > 0)).toBe(true);
    expect(results.some((result) => result.qualityIssues.some((issue) => issue.code === "FORMULA_ERROR"))).toBe(true);
  });
});
