import { Shell, PageHeader, Card } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { TrendChart } from "@/components/charts";
import { demoTrend } from "@/lib/data/fallback";
import { getProjectSummaries } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const projects = await getProjectSummaries();
  return (
    <Shell>
      <PageHeader title="经营总览" description="太樾与绿雪芽项目财务、运营、销售、库存与预警总览" />
      <div className="grid gap-5 xl:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-ink">GMV趋势</h2>
          <TrendChart data={demoTrend} />
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">今日关注</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>优先处理红色数据质量预警，尤其是推广日报公式错误。</p>
            <p>投资人账号默认只展示汇总指标，不展示支付明细、客户地址、电话和交易流水。</p>
            <p>上传中心支持 Excel/HTML 样本解析、预览、入库和版本留存。</p>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
