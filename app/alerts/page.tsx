import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";

async function getAlerts() {
  try {
    return await prisma.alertEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { project: true } });
  } catch {
    return [];
  }
}

export default async function AlertsPage() {
  const alerts = await getAlerts();
  return (
    <Shell>
      <PageHeader title="预警中心" description="现金流、应收应付、库存、销售、推广与数据质量预警" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">等级</th><th>项目</th><th>标题</th><th>说明</th><th>状态</th></tr></thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-t">
                  <td className="py-3"><StatusPill tone={alert.severity === "red" ? "red" : alert.severity === "orange" ? "orange" : "neutral"}>{alert.severity}</StatusPill></td>
                  <td>{alert.project.name}</td>
                  <td className="font-medium text-ink">{alert.title}</td>
                  <td className="max-w-xl text-slate-600">{alert.message}</td>
                  <td>{alert.status}</td>
                </tr>
              ))}
              {!alerts.length ? <tr><td className="py-6 text-slate-500" colSpan={5}>暂无预警，或数据库尚未连接。</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
