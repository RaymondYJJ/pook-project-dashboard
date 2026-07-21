import type { ReportType } from "@prisma/client";

export function usesMonthlyVersionScope(reportType: ReportType) {
  return reportType === "finance" || reportType === "management";
}

export function buildActiveVersionWhere(input: {
  projectId: string;
  reportType: ReportType;
  reportDate: Date;
  reportMonth: Date;
  originalName: string;
}) {
  return {
    projectId: input.projectId,
    reportType: input.reportType,
    ...(usesMonthlyVersionScope(input.reportType) ? { reportMonth: input.reportMonth } : { reportDate: input.reportDate }),
    originalName: input.originalName
  };
}
