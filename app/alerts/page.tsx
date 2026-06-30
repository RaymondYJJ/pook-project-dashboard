import Link from "next/link";
import type { AlertSeverity, AlertStatus } from "@prisma/client";
import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";

type AlertsPageProps = {
  searchParams?: {
    projectId?: string;
    severity?: AlertSeverity;
    alertType?: string;
    ownerName?: string;
    status?: AlertStatus;
    alertId?: string;
    error?: string;
  };
};

const severityLabels: Record<string, string> = {
  red: "立即处理",
  orange: "需要关注",
  yellow: "趋势异常",
  green: "正常",
  info: "提示"
};

const statusLabels: Record<string, string> = {
  open: "未处理",
  acknowledged: "处理中",
  resolved: "已处理",
  ignored: "已忽略"
};

const typeLabels: Record<string, string> = {
  cashflow: "现金流预警",
  receivable: "应收预警",
  payable: "应付预警",
  inventory_low: "库存低水位预警",
  inventory_high: "库存高水位预警",
  slow_moving: "滞销预警",
  no_sales: "不动销预警",
  sales_target: "渠道销售目标预警",
  promotion_roi: "推广ROI预警",
  data_quality: "数据质量预警"
};

async function getAlertData(searchParams: AlertsPageProps["searchParams"]) {
  try {
    const where = {
      ...(searchParams?.projectId ? { projectId: searchParams.projectId } : {}),
      ...(searchParams?.severity ? { severity: searchParams.severity } : {}),
      ...(searchParams?.alertType ? { alertType: searchParams.alertType } : {}),
      ...(searchParams?.ownerName ? { ownerName: searchParams.ownerName } : {}),
      ...(searchParams?.status ? { status: searchParams.status } : {})
    };
    const [alerts, projects, owners, selected] = await Promise.all([
      prisma.alertEvent.findMany({
        where,
        orderBy: [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
        take: 200,
        include: { project: true, rule: true }
      }),
      prisma.project.findMany({ orderBy: { code: "asc" } }),
      prisma.alertEvent.findMany({
        where: { ownerName: { not: null } },
        distinct: ["ownerName"],
        select: { ownerName: true },
        orderBy: { ownerName: "asc" }
      }),
      searchParams?.alertId
        ? prisma.alertEvent.findUnique({ where: { id: searchParams.alertId }, include: { project: true, rule: true } })
        : null
    ]);
    return { alerts, projects, owners: owners.map((item) => item.ownerName).filter(Boolean) as string[], selected };
  } catch {
    return { alerts: [], projects: [], owners: [], selected: null };
  }
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const { alerts, projects, owners, selected } = await getAlertData(searchParams);
  const currentUrl = `/alerts?${new URLSearchParams(Object.entries(searchParams ?? {}).filter(([, value]) => Boolean(value)) as [string, string][]).toString()}`;

  return (
    <Shell>
      <PageHeader title="预警中心" description="现金流、应收应付、库存、销售、推广与数据质量预警" />
      {searchParams?.error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">预警状态更新失败，请检查参数。</div> : null}

      <Card>
        <form className="grid gap-3 md:grid-cols-5 lg:grid-cols-6">
          <FilterSelect name="projectId" label="项目" value={searchParams?.projectId} options={projects.map((project) => [project.id, project.name])} />
          <FilterSelect name="severity" label="等级" value={searchParams?.severity} options={Object.entries(severityLabels)} />
          <FilterSelect name="alertType" label="类型" value={searchParams?.alertType} options={Object.entries(typeLabels)} />
          <FilterSelect name="ownerName" label="负责人" value={searchParams?.ownerName} options={owners.map((owner) => [owner, owner])} />
          <FilterSelect name="status" label="状态" value={searchParams?.status} options={Object.entries(statusLabels)} />
          <div className="flex items-end gap-2">
            <button className="rounded bg-navy px-4 py-2 text-sm font-medium text-white">筛选</button>
            <Link href="/alerts" className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">重置</Link>
          </div>
        </form>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">预警事件</h2>
            <span className="text-sm text-slate-500">{alerts.length} 条</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr><th className="py-2">等级</th><th>项目</th><th>类型</th><th>指标</th><th>当前/阈值</th><th>负责人</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="border-t align-top">
                    <td className="py-3"><SeverityPill severity={alert.severity} /></td>
                    <td>{alert.project.name}</td>
                    <td>{typeLabels[alert.alertType] ?? alert.alertType}</td>
                    <td className="font-medium text-ink">{alert.metric ?? "-"}</td>
                    <td>{formatNumber(alert.metricValue)} / {formatNumber(alert.threshold)}</td>
                    <td>{alert.ownerName ?? "待分配"}</td>
                    <td><StatusPill tone={statusTone(alert.status)}>{statusLabels[alert.status]}</StatusPill></td>
                    <td><Link href={appendParam(currentUrl, "alertId", alert.id)} className="text-navy hover:underline">详情</Link></td>
                  </tr>
                ))}
                {!alerts.length ? <tr><td className="py-6 text-slate-500" colSpan={8}>暂无匹配预警。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">预警详情</h2>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{selected.title}</h3>
                  <SeverityPill severity={selected.severity} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selected.message}</p>
              </div>
              <DetailGrid
                rows={[
                  ["项目", selected.project.name],
                  ["预警类型", typeLabels[selected.alertType] ?? selected.alertType],
                  ["触发指标", selected.metric ?? "-"],
                  ["当前值", formatNumber(selected.metricValue)],
                  ["阈值", formatNumber(selected.threshold)],
                  ["触发原因", selected.reason ?? selected.message],
                  ["建议动作", selected.suggestion ?? "请负责人复核并填写处理结论。"],
                  ["数据来源", selected.sourceLabel ?? "已确认入库数据"],
                  ["负责人", selected.ownerName ?? "待分配"],
                  ["状态", statusLabels[selected.status]],
                  ["创建时间", formatDateTime(selected.createdAt)],
                  ["更新时间", formatDateTime(selected.updatedAt)]
                ]}
              />
              <form action="/api/alerts/status" method="post" className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input type="hidden" name="alertId" value={selected.id} />
                <input type="hidden" name="returnTo" value={currentUrl} />
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  处理状态
                  <select name="status" defaultValue={selected.status} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  处理备注
                  <textarea name="handlingNote" defaultValue={selected.handlingNote ?? ""} rows={4} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="填写处理过程、责任人反馈或忽略原因" />
                </label>
                <button className="rounded bg-pine px-4 py-2 text-sm font-medium text-white">保存处理</button>
              </form>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">点击左侧预警查看详情和处理。</div>
          )}
        </Card>
      </div>
    </Shell>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: Array<[string, string]> }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select name={name} defaultValue={value ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">全部</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function SeverityPill({ severity }: { severity: AlertSeverity }) {
  const tone = severity === "red" ? "red" : severity === "orange" ? "orange" : severity === "green" ? "green" : "neutral";
  return <StatusPill tone={tone}>{severityLabels[severity]}</StatusPill>;
}

function statusTone(status: AlertStatus) {
  if (status === "resolved") return "green";
  if (status === "acknowledged") return "orange";
  if (status === "ignored") return "neutral";
  return "red";
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-slate-800">{value}</div>
        </div>
      ))}
    </div>
  );
}

function appendParam(url: string, key: string, value: string) {
  const [pathname, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function formatDateTime(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}
