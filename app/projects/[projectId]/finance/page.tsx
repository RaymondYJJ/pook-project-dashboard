import { Shell, PageHeader, Card, Kpi } from "@/components/ui";

export default function FinancePage() {
  return (
    <Shell>
      <PageHeader title="财务与现金流" description="资产负债表、利润表、现金流量表、往来和支付明细汇总" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="货币资金" value="-" />
        <Kpi label="应收账款" value="-" />
        <Kpi label="应付账款" value="-" tone="risk" />
        <Kpi label="经营现金流净额" value="-" />
      </div>
      <Card className="mt-5">
        <p className="text-sm text-slate-600">投资人角色将自动隐藏支付明细、银行账号、客户地址、客户电话和底层交易流水。</p>
      </Card>
    </Shell>
  );
}
