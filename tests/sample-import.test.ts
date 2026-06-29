import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSourceFile } from "@/lib/parsers";

describe("sample import dry run", () => {
  it("dry-runs all uploaded sample files", async () => {
    const files = [
      "佰茶财报2026.05月.xlsx",
      "绿雪芽1-6月管报V2.xlsx",
      "璞樾财报2026.05月.xlsx",
      "太樾1-5管报.xlsx",
      "太樾推广日报0622.xlsx",
      "绿雪芽采购登记台账.xlsx"
    ];
    const results = [];
    for (const file of files) {
      results.push(await parseSourceFile(path.join(process.cwd(), "sample-files", file), file));
    }
    expect(results.every((result) => result.parserType !== "unknown")).toBe(true);
  });
});
