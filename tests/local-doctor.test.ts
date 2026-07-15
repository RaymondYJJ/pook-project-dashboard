import { describe, expect, it } from "vitest";
import { buildLocalDoctorReport, type LocalDoctorProbe } from "@/lib/local/doctor";

const okProbe: LocalDoctorProbe = {
  hasPackageJson: true,
  hasEnvFile: true,
  hasEnvExample: true,
  hasDatabaseUrl: true,
  hasAuthSecret: true,
  hasUploadDir: true,
  nodeMajor: 20,
  dockerAvailable: true,
  databaseReachable: true,
  prismaGenerated: true,
  adminUserExists: true,
  sampleFileCount: 11
};

describe("local doctor report", () => {
  it("reports a ready local development environment", () => {
    const report = buildLocalDoctorReport(okProbe);

    expect(report.ready).toBe(true);
    expect(report.summary).toBe("本地环境已就绪，可以运行 npm run dev。");
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("returns actionable fixes for common local setup gaps", () => {
    const report = buildLocalDoctorReport({
      ...okProbe,
      hasEnvFile: false,
      hasDatabaseUrl: false,
      dockerAvailable: false,
      databaseReachable: false,
      adminUserExists: false,
      sampleFileCount: 0
    });

    expect(report.ready).toBe(false);
    expect(report.checks.filter((check) => check.status === "fail").map((check) => check.id)).toEqual([
      "env-file",
      "env-values",
      "docker",
      "database",
      "admin-user",
      "sample-files"
    ]);
    expect(report.nextSteps).toContain("cp .env.example .env");
    expect(report.nextSteps).toContain("打开 Docker Desktop，然后运行 npm run db:up。");
    expect(report.nextSteps).toContain("运行 npm run setup:local 初始化数据库和默认管理员。");
    expect(report.nextSteps).toHaveLength(5);
  });
});
