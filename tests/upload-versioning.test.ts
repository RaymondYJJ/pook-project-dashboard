import { describe, expect, it } from "vitest";
import { buildActiveVersionWhere } from "@/lib/uploads/versioning";

describe("upload versioning scope", () => {
  it("scopes active replacement by original file name so channel daily files can coexist", () => {
    const where = buildActiveVersionWhere({
      projectId: "project-1",
      reportType: "sales",
      reportDate: new Date("2026-07-21T00:00:00.000Z"),
      reportMonth: new Date("2026-07-01T00:00:00.000Z"),
      originalName: "绿雪芽天猫运营日报7.21.xlsx"
    });

    expect(where).toEqual({
      projectId: "project-1",
      reportType: "sales",
      reportDate: new Date("2026-07-21T00:00:00.000Z"),
      originalName: "绿雪芽天猫运营日报7.21.xlsx"
    });
  });

  it("uses report month for monthly reports while still scoping by file name", () => {
    const where = buildActiveVersionWhere({
      projectId: "project-1",
      reportType: "management",
      reportDate: new Date("2026-06-30T00:00:00.000Z"),
      reportMonth: new Date("2026-06-01T00:00:00.000Z"),
      originalName: "绿雪芽1-6月管报V2.xlsx"
    });

    expect(where).toEqual({
      projectId: "project-1",
      reportType: "management",
      reportMonth: new Date("2026-06-01T00:00:00.000Z"),
      originalName: "绿雪芽1-6月管报V2.xlsx"
    });
  });
});
