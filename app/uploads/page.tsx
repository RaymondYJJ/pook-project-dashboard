import Link from "next/link";
import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";

type UploadsPageProps = {
  searchParams?: {
    batchId?: string;
    error?: string;
    confirmed?: string;
    rolledBack?: string;
  };
};

const reportTypeLabels: Record<string, string> = {
  finance: "财报",
  management: "管报",
  sales: "销售日报",
  promotion: "推广日报",
  inventory: "商品日报",
  purchase: "采购台账"
};

const projectLabels: Record<string, string> = {
  taiyue: "太樾",
  luxueya: "绿雪芽"
};

async function getUploads() {
  try {
    return await prisma.uploadBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { project: true, sourceFiles: true }
    });
  } catch {
    return [];
  }
}

async function getSelectedBatch(batchId?: string) {
  if (!batchId) return null;
  try {
    return await prisma.uploadBatch.findUnique({
      where: { id: batchId },
      include: { project: true, sourceFiles: true }
    });
  } catch {
    return null;
  }
}

export default async function UploadsPage({ searchParams }: UploadsPageProps) {
  const [files, selectedBatch] = await Promise.all([getUploads(), getSelectedBatch(searchParams?.batchId)]);
  const preview = selectedBatch?.preview as Record<string, unknown> | null;
  const rowCounts = (preview?.rowCounts ?? {}) as Record<string, number>;
  const anomalyCounts = (preview?.anomalyCounts ?? {}) as Record<string, number>;
  const anomalyFlags = (preview?.anomalyFlags ?? {}) as Record<string, boolean>;
  const fields = ((preview?.fields ?? []) as string[]).slice(0, 30);
  const sheets = ((preview?.sheets ?? []) as string[]).slice(0, 20);

  return (
    <Shell>
      <PageHeader title="数据上传中心" description="Excel 上传、解析预览、确认入库、历史版本与回滚" />

      {searchParams?.error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</div>
      ) : null}
      {searchParams?.confirmed ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">已确认入库，看板会读取该日期的最新确认版本。</div> : null}
      {searchParams?.rolledBack ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">已回滚并激活选中的历史版本。</div> : null}

      <Card>
        <form action="/api/uploads" method="post" encType="multipart/form-data" className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            项目
            <select name="projectCode" required className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="taiyue">太樾</option>
              <option value="luxueya">绿雪芽</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            报表类型
            <select name="reportType" required className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="finance">财报</option>
              <option value="management">管报</option>
              <option value="sales">销售日报</option>
              <option value="promotion">推广日报</option>
              <option value="inventory">商品日报</option>
              <option value="purchase">采购台账</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            报表日期或月份
            <input name="reportDate" type="date" required className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Excel 文件
            <input name="file" type="file" required accept=".xlsx,.xls" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <button className="rounded bg-navy px-5 py-2.5 text-sm font-medium text-white">上传并解析</button>
        </form>
      </Card>

      {selectedBatch && preview ? (
        <Card className="mt-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h2 className="text-base font-semibold text-ink">解析预览</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedBatch.sourceFiles[0]?.originalName} · {projectLabels[selectedBatch.project?.code ?? ""] ?? "-"} · {reportTypeLabels[String(selectedBatch.reportType)] ?? "-"} · v{selectedBatch.version}
              </p>
            </div>
            <div className="flex gap-2">
              {selectedBatch.status === "parsed" ? (
                <form action="/api/uploads/confirm" method="post">
                  <input type="hidden" name="batchId" value={selectedBatch.id} />
                  <button className="rounded bg-pine px-4 py-2 text-sm font-medium text-white">确认入库</button>
                </form>
              ) : null}
              {selectedBatch.status === "imported" && !selectedBatch.activeAt ? (
                <form action="/api/uploads/rollback" method="post">
                  <input type="hidden" name="batchId" value={selectedBatch.id} />
                  <button className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">回滚到此版本</button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Metric label="数据行数" value={sumValues(rowCounts).toLocaleString("zh-CN")} />
            <Metric label="异常数量" value={Number(preview.qualityIssueCount ?? 0).toLocaleString("zh-CN")} tone={Number(preview.qualityIssueCount ?? 0) ? "risk" : "ok"} />
            <Metric label="识别 sheet" value={sheets.length.toString()} />
            <Metric label="字段数量" value={fields.length.toString()} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <PreviewBlock title="识别到的 sheet" items={sheets} />
            <PreviewBlock title="识别到的字段" items={fields} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink">识别到的核心指标</h3>
              <pre className="max-h-72 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(preview.coreMetrics ?? {}, null, 2)}</pre>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink">数据质量检查</h3>
              <div className="flex flex-wrap gap-2">
                <Flag active={Boolean(anomalyFlags.refErrors)}>#REF!</Flag>
                <Flag active={Boolean(anomalyFlags.div0Errors)}>#DIV/0!</Flag>
                <Flag active={Boolean(anomalyFlags.valueErrors)}>#VALUE!</Flag>
                <Flag active={Boolean(anomalyFlags.emptyFields)}>空字段</Flag>
                <Flag active={Boolean(anomalyFlags.duplicateDates)}>重复日期</Flag>
              </div>
              <pre className="mt-3 max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(anomalyCounts, null, 2)}</pre>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mt-5">
        <h2 className="mb-4 text-base font-semibold text-ink">上传版本</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">文件</th><th>项目</th><th>类型</th><th>日期/月</th><th>版本</th><th>状态</th><th>质量</th><th>操作</th></tr>
            </thead>
            <tbody>
              {files.map((batch) => {
                const sourceFile = batch.sourceFiles[0];
                const qualityCount = Array.isArray(sourceFile?.qualityIssues) ? sourceFile.qualityIssues.length : Number((sourceFile?.parseSummary as Record<string, unknown> | null)?.qualityIssueCount ?? 0);
                return (
                  <tr key={batch.id} className="border-t">
                    <td className="max-w-64 truncate py-3">{sourceFile?.originalName ?? "-"}</td>
                    <td>{batch.project?.name ?? "-"}</td>
                    <td>{reportTypeLabels[String(batch.reportType)] ?? "-"}</td>
                    <td>{formatDate(batch.reportType === "finance" || batch.reportType === "management" ? batch.reportMonth : batch.reportDate)}</td>
                    <td>v{batch.version}</td>
                    <td><StatusPill tone={batch.activeAt ? "green" : batch.status === "failed" ? "red" : "neutral"}>{batch.activeAt ? "当前版本" : statusLabel(batch.status)}</StatusPill></td>
                    <td><StatusPill tone={qualityCount ? "red" : "green"}>{qualityCount} 个问题</StatusPill></td>
                    <td className="whitespace-nowrap">
                      <Link href={`/uploads?batchId=${batch.id}`} className="text-navy hover:underline">查看</Link>
                    </td>
                  </tr>
                );
              })}
              {!files.length ? <tr><td className="py-6 text-slate-500" colSpan={8}>暂无上传记录，或数据库尚未连接。</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "risk" | "ok" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={tone === "risk" ? "mt-2 text-2xl font-semibold text-risk" : tone === "ok" ? "mt-2 text-2xl font-semibold text-pine" : "mt-2 text-2xl font-semibold text-ink"}>{value}</div>
    </div>
  );
}

function PreviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      <div className="flex max-h-48 flex-wrap gap-2 overflow-auto">
        {items.length ? items.map((item) => <span key={item} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">{item}</span>) : <span className="text-sm text-slate-500">未识别</span>}
      </div>
    </div>
  );
}

function Flag({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <StatusPill tone={active ? "red" : "green"}>{children}: {active ? "存在" : "未发现"}</StatusPill>;
}

function sumValues(value: Record<string, number>) {
  return Object.values(value).reduce((sum, item) => sum + (Number(item) || 0), 0);
}

function formatDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待解析",
    parsed: "待确认",
    imported: "已入库",
    failed: "失败",
    rolled_back: "已回滚"
  };
  return labels[status] ?? status;
}
