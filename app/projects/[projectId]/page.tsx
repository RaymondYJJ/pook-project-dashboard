import Link from "next/link";
import { Shell, PageHeader, Card, Kpi } from "@/components/ui";
import { ChannelBarChart } from "@/components/charts";
import { getProjectSummary } from "@/lib/data/dashboard";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const project = await getProjectSummary(params.projectId);
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="本月GMV" value={formatMoney(project.monthGmv)} tone="gold" />
        <Kpi label="完成率" value={formatPercent(project.completionRate)} />
        <Kpi label="销售出库" value={formatMoney(project.salesOutbound)} />
        <Kpi label="项目利润" value={formatMoney(project.projectProfit)} tone={project.projectProfit < 0 ? "risk" : "green"} />
        <Kpi label="现金余额" value={formatMoney(project.cashBalance)} />
        <Kpi label="预警数量" value={`${project.alertCount}`} tone={project.alertCount ? "risk" : "green"} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-ink">渠道销售结构</h2>
          <ChannelBarChart data={[{ name: "天猫", value: 38 }, { name: "京东", value: 26 }, { name: "抖音", value: 18 }, { name: "小红书", value: 8 }, { name: "线下", value: 10 }]} />
        </Card>
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
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-ink">经营总览</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">V1 已打通财报、管报、销售、推广、库存和采购 parser。上传样本后，本页会优先展示数据库汇总指标；数据库未连接时展示空态。</p>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">运营预警</h2>
          <p className="mt-3 text-sm text-slate-600">基础预警覆盖现金流、SKU低库存/滞销/不动销、推广公式错误和数据质量问题。</p>
        </Card>
      </div>
    </Shell>
  );
}
