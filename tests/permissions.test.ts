import { describe, expect, it } from "vitest";
import { canUpload, canViewSensitive, filterSensitive } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("limits investor sensitive data", () => {
    expect(canUpload("investor")).toBe(false);
    expect(canViewSensitive("investor")).toBe(false);
    const row = filterSensitive({ accountName: "招商银行", customerPhone: "13800000000", amount: 100 }, "investor");
    expect(row.accountName).toBe("[受限]");
    expect(row.customerPhone).toBe("[受限]");
    expect(row.amount).toBe(100);
  });

  it("allows finance to view sensitive data", () => {
    expect(canViewSensitive("finance")).toBe(true);
    expect(canUpload("finance")).toBe(true);
  });
});
