import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Shell, PageHeader, Card, Kpi, StatusPill } from "@/components/ui";
import { CashflowTrendChart, ChannelBarChart, InventoryRiskChart, MonthlyTrendChart, ProfitStructureChart } from "@/components/charts";
import { getProjectDashboard } from "@/lib/data/dashboard";
import type { MetricDatum } from "@/lib/data/fallback";
import { formatMoney, formatPercent } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";

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

function hasRows<T>(rows: T[]) {
  return rows.length > 0;
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const [dashboard, session] = await Promise.all([getProjectDashboard(params.projectId), getSession()]);
  const project = dashboard.project;
  const isInvestor = session?.role === "investor";
  const modules = [
    ["渠道销售", "sales"],
    ["推广投放", "promotion"],
    ["库存周转", "inventory"],
    ["采购与未提货", "purchase"],
    ["财务与现金流", "finance"]
  ];

  return (
    <Shell>
      <PageHeader title={project.name} description={`主体：${project.entityName}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="今日销售" value={metricMoney(project.todaySales)} sourceDate={project.todaySales.sourceDate} updatedAt={project.todaySales.updatedAt} />
        <Kpi label="本月销售" value={metricMoney(project.monthSales)} tone="gold" sourceDate={project.monthSales.sourceDate} updatedAt={project.monthSales.updatedAt} />
        <Kpi label="目标完成率" value={metricPercent(project.completionRate)} sourceDate={project.completionRate.sourceDate} updatedAt={project.completionRate.updatedAt} />
        <Kpi label="项目利润" value={metricMoney(project.projectProfit)} tone={(project.projectProfit.value ?? 0) < 0 ? "risk" : "green"} sourceDate={project.projectProfit.sourceDate} updatedAt={project.projectProfit.updatedAt} />
        <Kpi label="现金余额" value={metricMoney(project.cashBalance)} sourceDate={project.cashBalance.sourceDate} updatedAt={project.cashBalance.updatedAt} />
        <Kpi label="应收账款" value={metricMoney(project.receivables)} sourceDate={project.receivables.sourceDate} updatedAt={project.receivables.updatedAt} />
        <Kpi label="应付账款" value={metricMoney(project.payables)} tone="risk" sourceDate={project.payables.sourceDate} updatedAt={project.payables.updatedAt} />
        <Kpi label="库存金额" value={metricMoney(project.inventoryAmount)} sourceDate={project.inventoryAmount.sourceDate} updatedAt={project.inventoryAmount.updatedAt} />
        <Kpi label="库存周转天数" value={metricDays(project.turnoverDays)} sourceDate={project.turnoverDays.sourceDate} updatedAt={project.turnoverDays.updatedAt} />
        <Kpi label="预警数量" value={metricCount(project.alertCount)} tone={(project.alertCount.value ?? 0) > 0 ? "risk" : "green"} sourceDate={project.alertCount.sourceDate} updatedAt={project.alertCount.updatedAt} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="月度趋势图" empty={!hasRows(dashboard.monthlyTrend)}>
          <MonthlyTrendChart data={dashboard.monthlyTrend} />
        </ChartCard>
        <ChartCard title="渠道销售结构图" empty={!hasRows(dashboard.channelSales)}>
          <ChannelBarChart data={dashboard.channelSales} />
        </ChartCard>
        <ChartCard title="利润结构图" empty={!hasRows(dashboard.profitStructure)}>
          <ProfitStructureChart data={dashboard.profitStructure} />
        </ChartCard>
        <ChartCard title="库存风险图" empty={!hasRows(dashboard.inventoryRisk)}>
          <InventoryRiskChart data={dashboard.inventoryRisk} />
        </ChartCard>
        <ChartCard title="现金流趋势图" empty={!hasRows(dashboard.cashflowTrend)}>
          <CashflowTrendChart data={dashboard.cashflowTrend} />
        </ChartCard>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">预警列表</h2>
            <StatusPill tone={(project.alertCount.value ?? 0) > 0 ? "red" : "green"}>{metricCount(project.alertCount)} 个</StatusPill>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-ink">
                    <AlertTriangle className={alert.severity === "red" ? "h-4 w-4 text-risk" : "h-4 w-4 text-gold"} />
                    {alert.title}
                  </div>
                  <span className="text-xs text-slate-400">{alert.date}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">{alert.message}</p>
              </div>
            ))}
            {!dashboard.alerts.length ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">暂无打开中的预警。</p> : null}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-ink">数据来源</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.sourceSummary.map((source) => (
              <div key={source.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="font-medium text-ink">{source.label}</div>
                <div className="mt-1 text-xs text-slate-500">数据日期：{source.sourceDate ?? "待上传"} · 最后更新：{source.updatedAt ?? "待核实"}</div>
              </div>
            ))}
            {!dashboard.sourceSummary.length ? <p className="text-sm text-slate-500">暂无已确认数据源。</p> : null}
          </div>
        </Card>
        {!isInvestor ? (
          <Card>
            <h2 className="text-base font-semibold text-ink">项目模块</h2>
            <div className="mt-4 grid gap-2">
              {modules.map(([label, href]) => (
                <Link key={href} href={`/projects/${project.id}/${href}`} className="rounded border border-slate-200 px-3 py-2 text-sm hover:border-navy hover:text-navy">
                  {label}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {empty ? <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">待上传或待核实</div> : children}
    </Card>
  );
}
