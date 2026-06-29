import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, Kpi, StatusPill } from "@/components/ui";
import { formatMoney, formatPercent } from "@/lib/utils";
import type { ProjectSummary } from "@/lib/data/fallback";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{project.name}</h2>
          <p className="mt-1 text-sm text-slate-500">主体：{project.entityName}</p>
        </div>
        <StatusPill tone={project.alertCount ? "red" : "green"}>
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          {project.alertCount} 个预警
        </StatusPill>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="今日GMV" value={formatMoney(project.todayGmv)} />
        <Kpi label="本月GMV" value={formatMoney(project.monthGmv)} tone="gold" />
        <Kpi label="目标完成率" value={formatPercent(project.completionRate)} />
        <Kpi label="销售出库" value={formatMoney(project.salesOutbound)} />
        <Kpi label="项目利润" value={formatMoney(project.projectProfit)} tone={project.projectProfit < 0 ? "risk" : "green"} />
        <Kpi label="现金余额" value={formatMoney(project.cashBalance)} />
        <Kpi label="应收账款" value={formatMoney(project.receivables)} />
        <Kpi label="应付账款" value={formatMoney(project.payables)} tone="risk" />
        <Kpi label="库存金额" value={formatMoney(project.inventoryAmount)} />
        <Kpi label="库存周转天数" value={`${project.turnoverDays || 0}天`} />
      </div>
      <Link href={`/projects/${project.id}`} className="mt-5 inline-flex rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-ink">
        查看项目详情
      </Link>
    </Card>
  );
}
