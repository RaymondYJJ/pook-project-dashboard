import { Shell, PageHeader, Card } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
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
          <h2 className="text-base font-semibold text-ink">数据口径</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <p>经营卡片默认读取每个项目、报表类型、报表日期的最新确认版本。历史版本保留在上传中心，可按需回滚激活。</p>
            <p>缺失指标显示“待上传”或“待核实”，不会用 0 替代，避免管理层误判经营状态。</p>
            <p>投资人角色仅查看汇总指标和图表，不展示支付明细、客户信息、原始订单和底层交易流水。</p>
            <p>每个 KPI 下方展示数据来源日期与最后更新时间，用于追踪报表时效。</p>
          </div>
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
