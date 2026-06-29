import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";
import { defaultAlertRules } from "@/lib/alerts/engine";

export default function RulesPage() {
  return (
    <Shell>
      <PageHeader title="预警规则配置" description="V1 内置规则可初始化到数据库，后续可在此页面编辑阈值和启停状态" />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">规则</th><th>指标</th><th>条件</th><th>等级</th><th>状态</th></tr></thead>
          <tbody>
            {defaultAlertRules.map((rule) => (
              <tr key={rule.code} className="border-t">
                <td className="py-3 font-medium">{rule.name}</td>
                <td>{rule.metric}</td>
                <td>{rule.operator} {rule.threshold}</td>
                <td><StatusPill tone={rule.severity === "red" ? "red" : rule.severity === "orange" ? "orange" : "neutral"}>{rule.severity}</StatusPill></td>
                <td><StatusPill tone="green">启用</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
