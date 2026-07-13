import { describe, expect, it } from "vitest";
import { getUploadBusinessGroup, summarizeUploadPreview } from "@/lib/uploads/preview";

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
});
