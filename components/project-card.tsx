import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, Kpi, StatusPill } from "@/components/ui";
import { formatMoney, formatPercent } from "@/lib/utils";
import type { MetricDatum, ProjectSummary } from "@/lib/data/fallback";

function metricMoney(metric: MetricDatum) {
  return metric.value === null ? "待上传" : formatMoney(metric.value);
}

function metricPercent(metric: MetricDatum) {
  return metric.value === null ? "待核实" : formatPercent(metric.value);
}

function metricDays(metric: MetricDatum) {
  return metric.value === null ? "待上传" : `${Number(metric.value).toFixed(1)}天`;
}

function metricCount(metric: MetricDatum) {
  return metric.value === null ? "待核实" : `${Math.round(metric.value)}`;
}

function kpiTone(metric: MetricDatum, kind?: "profit" | "risk") {
  if (metric.value === null) return "default";
  if (kind === "profit") return metric.value < 0 ? "risk" : "green";
  if (kind === "risk") return metric.value > 0 ? "risk" : "green";
  return "default";
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const alertValue = project.alertCount.value ?? 0;
  return (
    <Link href={`/projects/${project.id}`} className="block focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2">
      <Card className="h-full transition hover:border-navy hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-500">主体：{project.entityName}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={alertValue ? "red" : "green"}>
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              {metricCount(project.alertCount)} 个预警
            </StatusPill>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label="今日销售" value={metricMoney(project.todaySales)} sourceDate={project.todaySales.sourceDate} updatedAt={project.todaySales.updatedAt} />
          <Kpi label="本月销售" value={metricMoney(project.monthSales)} tone="gold" sourceDate={project.monthSales.sourceDate} updatedAt={project.monthSales.updatedAt} />
          <Kpi label="目标完成率" value={metricPercent(project.completionRate)} sourceDate={project.completionRate.sourceDate} updatedAt={project.completionRate.updatedAt} />
          <Kpi label="项目利润" value={metricMoney(project.projectProfit)} tone={kpiTone(project.projectProfit, "profit")} sourceDate={project.projectProfit.sourceDate} updatedAt={project.projectProfit.updatedAt} />
          <Kpi label="现金余额" value={metricMoney(project.cashBalance)} sourceDate={project.cashBalance.sourceDate} updatedAt={project.cashBalance.updatedAt} />
          <Kpi label="应收账款" value={metricMoney(project.receivables)} sourceDate={project.receivables.sourceDate} updatedAt={project.receivables.updatedAt} />
          <Kpi label="应付账款" value={metricMoney(project.payables)} tone="risk" sourceDate={project.payables.sourceDate} updatedAt={project.payables.updatedAt} />
          <Kpi label="库存金额" value={metricMoney(project.inventoryAmount)} sourceDate={project.inventoryAmount.sourceDate} updatedAt={project.inventoryAmount.updatedAt} />
          <Kpi label="库存周转天数" value={metricDays(project.turnoverDays)} sourceDate={project.turnoverDays.sourceDate} updatedAt={project.turnoverDays.updatedAt} />
          <Kpi label="预警数量" value={metricCount(project.alertCount)} tone={kpiTone(project.alertCount, "risk")} sourceDate={project.alertCount.sourceDate} updatedAt={project.alertCount.updatedAt} />
        </div>
      </Card>
    </Link>
  );
}
