import { prisma } from "@/lib/prisma";
import { fallbackProjects, type ProjectSummary } from "@/lib/data/fallback";

function n(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  try {
    const projects = await prisma.project.findMany();
    if (!projects.length) return fallbackProjects;
    return Promise.all(
      projects.map(async (project) => {
        const [mgmt, finance, inventory, alerts] = await Promise.all([
          prisma.managementReportRow.aggregate({
            where: { projectId: project.id, sourceFile: { isActiveVersion: true } },
            _sum: { gmv: true, salesOutbound: true, projectProfit: true },
            _avg: { profitRate: true }
          }),
          prisma.financeSnapshot.findFirst({ where: { projectId: project.id, sourceFile: { isActiveVersion: true } }, orderBy: { reportMonth: "desc" } }),
          prisma.inventorySnapshot.findFirst({ where: { projectId: project.id, sourceFile: { isActiveVersion: true } }, orderBy: { reportDate: "desc" } }),
          prisma.alertEvent.count({ where: { projectId: project.id, status: "open" } })
        ]);
        return {
          id: project.id,
          code: project.code,
          name: project.code === "taiyue" ? "太樾项目经营状态" : "绿雪芽项目经营状态",
          entityName: project.entityName,
          todayGmv: 0,
          monthGmv: n(mgmt._sum.gmv),
          completionRate: 0,
          salesOutbound: n(mgmt._sum.salesOutbound),
          projectProfit: n(mgmt._sum.projectProfit),
          cashBalance: n(finance?.endingCash ?? finance?.monetaryFunds),
          receivables: n(finance?.receivables),
          payables: n(finance?.payables),
          inventoryAmount: n(inventory?.inventoryAmount),
          turnoverDays: n(inventory?.turnoverDays),
          alertCount: alerts
        };
      })
    );
  } catch {
    return fallbackProjects;
  }
}

export async function getProjectSummary(projectId: string) {
  const items = await getProjectSummaries();
  return items.find((item) => item.id === projectId || item.code === projectId) ?? items[0];
}
