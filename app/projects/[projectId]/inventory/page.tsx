import { Shell, PageHeader, Card, StatusPill } from "@/components/ui";

export default function InventoryPage() {
  return (
    <Shell>
      <PageHeader title="库存周转" description="库存金额、周转天数、低库存、在途、残次品和现货率" />
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">风险</th><th>规则</th><th>状态</th></tr></thead>
          <tbody>
            <tr className="border-t"><td className="py-3">低库存SKU</td><td>可售天数 &lt; 14天</td><td><StatusPill tone="orange">启用</StatusPill></td></tr>
            <tr className="border-t"><td className="py-3">滞销SKU</td><td>周转天数 &gt; 120天</td><td><StatusPill tone="orange">启用</StatusPill></td></tr>
            <tr className="border-t"><td className="py-3">不动销</td><td>近30天销量=0且库存金额超阈值</td><td><StatusPill tone="orange">启用</StatusPill></td></tr>
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
