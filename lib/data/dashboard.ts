import type { AlertSeverity, Project, ProjectCode, ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fallbackProjects, type MetricDatum, type ProjectSummary } from "@/lib/data/fallback";

type SourceMeta = {
  sourceDate: string | null;
  updatedAt: string | null;
};

export type ProjectDashboard = {
  project: ProjectSummary;
  monthlyTrend: Array<{ name: string; sales: number | null; profit: number | null }>;
  channelSales: Array<{ name: string; value: number }>;
  profitStructure: Array<{ name: string; value: number }>;
  inventoryRisk: Array<{ name: string; value: number; tone: "risk" | "warn" | "ok" }>;
  cashflowTrend: Array<{ name: string; operatingCashflow: number | null; endingCash: number | null }>;
  alerts: Array<{ id: string; severity: AlertSeverity; title: string; message: string; date: string }>;
  sourceSummary: Array<{ label: string; sourceDate: string | null; updatedAt: string | null }>;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumNumber(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : parsed;
}

function dateOnly(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function monthLabel(value?: Date | null) {
  if (!value) return "待上传";
  return `${value.getUTCMonth() + 1}月`;
}

function metric(value: unknown, meta: SourceMeta): MetricDatum {
  return { value: toNumber(value), ...meta };
}

function emptyMeta(): SourceMeta {
  return { sourceDate: null, updatedAt: null };
}

async function getSourceMeta(projectId: string, reportType: ReportType): Promise<SourceMeta> {
  const file = await prisma.sourceFile.findFirst({
    where: { projectId, reportType, isActiveVersion: true },
    orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }]
  });
  return {
    sourceDate: dateOnly(file?.reportDate ?? file?.reportMonth),
    updatedAt: dateOnly(file?.confirmedAt ?? file?.updatedAt)
  };
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  try {
    const projects = await prisma.project.findMany({ orderBy: { code: "desc" } });
    if (!projects.length) return fallbackProjects;
    return Promise.all(projects.map((project) => buildProjectSummary(project)));
  } catch {
    return fallbackProjects;
  }
}

async function buildProjectSummary(project: Project): Promise<ProjectSummary> {
  const [managementMeta, salesMeta, financeMeta, inventoryMeta] = await Promise.all([
    getSourceMeta(project.id, "management"),
    getSourceMeta(project.id, "sales"),
    getSourceMeta(project.id, "finance"),
    getSourceMeta(project.id, "inventory")
  ]);

  const latestSalesDate = await prisma.salesDailyRow.findFirst({
    where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
    orderBy: { reportDate: "desc" },
    select: { reportDate: true }
  });

  const [todaySales, monthSales, completion, finance, inventory, alerts] = await Promise.all([
    latestSalesDate
      ? prisma.salesDailyRow.aggregate({
          where: { projectId: project.id, reportDate: latestSalesDate.reportDate, sourceFile: { isActiveVersion: true } },
          _sum: { actualSales: true, paymentAmount: true }
        })
      : null,
    prisma.managementReportRow.aggregate({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      _sum: { gmv: true, salesOutbound: true, projectProfit: true }
    }),
    prisma.salesDailyRow.aggregate({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      _sum: { actualSales: true, paymentAmount: true, gmvTarget: true }
    }),
    prisma.financeSnapshot.findFirst({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      orderBy: { reportMonth: "desc" }
    }),
    prisma.inventorySnapshot.findFirst({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      orderBy: { reportDate: "desc" }
    }),
    prisma.alertEvent.count({ where: { projectId: project.id, status: "open" } })
  ]);

  const target = toNumber(completion._sum.gmvTarget);
  const salesForCompletion = toNumber(completion._sum.actualSales) ?? toNumber(completion._sum.paymentAmount);
  const completionRate = target && salesForCompletion !== null ? salesForCompletion / target : null;

  return {
    id: project.id,
    code: project.code,
    name: project.code === "taiyue" ? "太樾项目经营状态" : "绿雪芽项目经营状态",
    entityName: project.entityName,
    todaySales: metric(todaySales ? todaySales._sum.actualSales ?? todaySales._sum.paymentAmount : null, {
      sourceDate: dateOnly(latestSalesDate?.reportDate) ?? salesMeta.sourceDate,
      updatedAt: salesMeta.updatedAt
    }),
    monthSales: metric(monthSales._sum.gmv, managementMeta),
    completionRate: metric(completionRate, salesMeta),
    salesOutbound: metric(monthSales._sum.salesOutbound, managementMeta),
    projectProfit: metric(monthSales._sum.projectProfit, managementMeta),
    cashBalance: metric(finance?.endingCash ?? finance?.monetaryFunds, financeMeta),
    receivables: metric(finance?.receivables, financeMeta),
    payables: metric(finance?.payables, financeMeta),
    inventoryAmount: metric(inventory?.inventoryAmount, inventoryMeta),
    turnoverDays: metric(inventory?.turnoverDays, inventoryMeta),
    alertCount: metric(alerts, { sourceDate: dateOnly(new Date()), updatedAt: dateOnly(new Date()) })
  };
}

export async function getProjectSummary(projectId: string) {
  const items = await getProjectSummaries();
  return items.find((item) => item.id === projectId || item.code === projectId) ?? items[0];
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
  const projectCode = isProjectCode(projectId) ? projectId : null;
  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { id: projectId },
        ...(projectCode ? [{ code: projectCode }] : [])
      ]
    }
  });
  if (!project) {
    return {
      project: fallbackProjects[0],
      monthlyTrend: [],
      channelSales: [],
      profitStructure: [],
      inventoryRisk: [],
      cashflowTrend: [],
      alerts: [],
      sourceSummary: []
    };
  }

  const [summary, monthly, channels, profit, inventoryRows, cashflow, alerts, sourceFiles] = await Promise.all([
    buildProjectSummary(project),
    prisma.managementReportRow.groupBy({
      by: ["reportMonth"],
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      _sum: { gmv: true, projectProfit: true },
      orderBy: { reportMonth: "asc" }
    }),
    prisma.managementReportRow.groupBy({
      by: ["channel"],
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      _sum: { gmv: true }
    }),
    prisma.managementReportRow.aggregate({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      _sum: { salesCost: true, adSpend: true, platformFees: true, promotionFees: true, staffFees: true, projectProfit: true }
    }),
    prisma.inventorySkuRow.findMany({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      select: { turnoverDays: true, sales30d: true, inventoryAmount: true }
    }),
    prisma.cashflowSnapshot.findMany({
      where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
      orderBy: { reportMonth: "asc" },
      take: 12
    }),
    prisma.alertEvent.findMany({
      where: { projectId: project.id, status: "open" },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.sourceFile.findMany({
      where: { projectId: project.id, isActiveVersion: true },
      orderBy: [{ reportType: "asc" }, { updatedAt: "desc" }]
    })
  ]);

  const lowStock = inventoryRows.filter((row) => {
    const days = toNumber(row.turnoverDays);
    return days !== null && days < 14;
  }).length;
  const slowMoving = inventoryRows.filter((row) => {
    const days = toNumber(row.turnoverDays);
    return days !== null && days > 120;
  }).length;
  const noSales = inventoryRows.filter((row) => (toNumber(row.sales30d) ?? 0) === 0 && (toNumber(row.inventoryAmount) ?? 0) > 0).length;

  return {
    project: summary,
    monthlyTrend: monthly.map((row) => ({
      name: monthLabel(row.reportMonth),
      sales: sumNumber(row._sum.gmv),
      profit: sumNumber(row._sum.projectProfit)
    })),
    channelSales: channels
      .map((row) => ({ name: row.channel || "未分渠道", value: toNumber(row._sum.gmv) ?? 0 }))
      .filter((row) => row.value !== 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    profitStructure: [
      { name: "销售成本", value: Math.abs(toNumber(profit._sum.salesCost) ?? 0) },
      { name: "投放费用", value: Math.abs(toNumber(profit._sum.adSpend) ?? 0) },
      { name: "平台扣点", value: Math.abs(toNumber(profit._sum.platformFees) ?? 0) },
      { name: "促销费用", value: Math.abs(toNumber(profit._sum.promotionFees) ?? 0) },
      { name: "人员费用", value: Math.abs(toNumber(profit._sum.staffFees) ?? 0) },
      { name: "项目利润", value: Math.abs(toNumber(profit._sum.projectProfit) ?? 0) }
    ].filter((row) => row.value > 0),
    inventoryRisk: [
      { name: "低库存SKU", value: lowStock, tone: "risk" },
      { name: "滞销SKU", value: slowMoving, tone: "warn" },
      { name: "30天不动销", value: noSales, tone: "risk" },
      { name: "正常SKU", value: Math.max(inventoryRows.length - lowStock - slowMoving - noSales, 0), tone: "ok" }
    ],
    cashflowTrend: cashflow.map((row) => ({
      name: monthLabel(row.reportMonth),
      operatingCashflow: toNumber(row.operatingCashflow),
      endingCash: toNumber(row.endingCash)
    })),
    alerts: alerts.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      date: dateOnly(alert.reportDate) ?? "-"
    })),
    sourceSummary: sourceFiles.map((file) => ({
      label: `${reportTypeLabel(file.reportType)} v${file.version}`,
      sourceDate: dateOnly(file.reportDate ?? file.reportMonth),
      updatedAt: dateOnly(file.confirmedAt ?? file.updatedAt)
    }))
  };
}

function isProjectCode(value: string): value is ProjectCode {
  return value === "taiyue" || value === "luxueya";
}

function reportTypeLabel(reportType: ReportType | null) {
  const labels: Record<ReportType, string> = {
    finance: "财报",
    management: "管报",
    sales: "销售日报",
    promotion: "推广日报",
    inventory: "商品日报",
    purchase: "采购台账"
  };
  return reportType ? labels[reportType] : "源文件";
}
