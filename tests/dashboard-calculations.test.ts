import { describe, expect, it } from "vitest";
import { chooseMonthSalesValue } from "@/lib/data/dashboard-calculations";

describe("dashboard sales calculations", () => {
  it("uses latest sales daily month instead of management GMV totals for month sales", () => {
    const value = chooseMonthSalesValue({
      salesActualSales: 232208.71,
      salesPaymentAmount: 232208.71,
      managementGmv: 11866399.29
    });

    expect(value).toBe(232208.71);
  });

  it("falls back to management GMV when no sales daily month value exists", () => {
    const value = chooseMonthSalesValue({
      salesActualSales: null,
      salesPaymentAmount: null,
      managementGmv: 7605633.02
    });

    expect(value).toBe(7605633.02);
  });
});
