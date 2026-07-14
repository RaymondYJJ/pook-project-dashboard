import { describe, expect, it } from "vitest";
import { buildBatchConfirmRedirectParams, filterUploadBatches, getConfirmableUploadBatchIds, getUploadBusinessGroup, parseUploadBatchIds, serializeUploadBatchIds, summarizeUploadPreview } from "@/lib/uploads/preview";

describe("upload preview grouping", () => {
  it("groups high-frequency upload files by business purpose", () => {
    expect(getUploadBusinessGroup("finance", "佰茶绿雪芽资金收支一览表2026年6月.xlsx").key).toBe("finance");
    expect(getUploadBusinessGroup("management", "绿雪芽经营日报6.26.xlsx").key).toBe("operations");
    expect(getUploadBusinessGroup("sales", "绿雪芽天猫客服日报6.29.xlsx").key).toBe("operations");
    expect(getUploadBusinessGroup("promotion", "绿雪芽京东POP推广日报6.29.xlsx").key).toBe("marketing");
    expect(getUploadBusinessGroup("inventory", "绿雪芽-商品日报-6.26.xlsx").key).toBe("inventory");
    expect(getUploadBusinessGroup("purchase", "绿雪芽未提货明细表-0626.xlsx").key).toBe("inventory");
    expect(getUploadBusinessGroup("external_link", "绿雪芽25年财务分析报告.larkdocx.url").key).toBe("reference");
    expect(getUploadBusinessGroup("parse_failed", "损坏文件.xlsx").key).toBe("reference");
  });

  it("summarizes recognized rows and quality issues for preview cards", () => {
    expect(
      summarizeUploadPreview({
        rowCounts: { salesDailyRows: 12, promotionDailyRows: 0 },
        qualityIssueCount: 0
      })
    ).toEqual({ rowCount: 12, qualityIssueCount: 0, statusText: "可入库" });

    expect(
      summarizeUploadPreview({
        rowCounts: { salesDailyRows: 0 },
        qualityIssueCount: 2
      })
    ).toEqual({ rowCount: 0, qualityIssueCount: 2, statusText: "需复核" });
  });

  it("serializes upload batch ids and selects confirmable parsed batches", () => {
    expect(parseUploadBatchIds(serializeUploadBatchIds(["a", " b ", "", "a"]))).toEqual(["a", "b"]);
    expect(parseUploadBatchIds(["a,b", "c"])).toEqual(["a", "b", "c"]);

    expect(
      getConfirmableUploadBatchIds([
        { id: "finance-1", status: "parsed", reportType: "finance" },
        { id: "external-1", status: "parsed", reportType: null },
        { id: "failed-1", status: "failed", reportType: "sales" },
        { id: "sales-1", status: "parsed", reportType: "sales" }
      ])
    ).toEqual(["finance-1", "sales-1"]);
  });

  it("builds partial batch confirm redirect params", () => {
    const params = buildBatchConfirmRedirectParams({
      imported: ["finance-1", "sales-1"],
      failed: [
        { id: "promotion-1", message: "missing sheet" }
      ]
    });

    expect(params.get("batchId")).toBe("finance-1");
    expect(params.get("batchIds")).toBe("finance-1,sales-1");
    expect(params.get("confirmed")).toBe("2");
    expect(params.get("failed")).toBe("1");
    expect(params.get("error")).toContain("promotion-1");
  });

  it("filters upload batches by project group status and keyword", () => {
    const batches = [
      { id: "1", projectCode: "luxueya", reportType: "finance", status: "imported", active: true, fileName: "佰茶绿雪芽资金收支一览表2026年6月.xlsx", qualityIssueCount: 0 },
      { id: "2", projectCode: "luxueya", reportType: "promotion", status: "parsed", active: false, fileName: "绿雪芽京东POP推广日报6.29.xlsx", qualityIssueCount: 2 },
      { id: "3", projectCode: "taiyue", reportType: "sales", status: "failed", active: false, fileName: "太樾电商销售日报6.22.xlsx", qualityIssueCount: 1 }
    ];

    expect(filterUploadBatches(batches, { projectCode: "luxueya", group: "marketing" }).map((batch) => batch.id)).toEqual(["2"]);
    expect(filterUploadBatches(batches, { status: "active" }).map((batch) => batch.id)).toEqual(["1"]);
    expect(filterUploadBatches(batches, { query: "销售" }).map((batch) => batch.id)).toEqual(["3"]);
    expect(filterUploadBatches(batches, { quality: "clean" }).map((batch) => batch.id)).toEqual(["1"]);
    expect(filterUploadBatches(batches, { quality: "issues" }).map((batch) => batch.id)).toEqual(["2", "3"]);
  });
});
