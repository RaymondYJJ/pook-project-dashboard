import { Shell, PageHeader, Card } from "@/components/ui";

export default function PurchasePage() {
  return (
    <Shell>
      <PageHeader title="采购与未提货" description="采购OA、SAP编码、采购额、实际入库、余量、分销发货和耗材采购" />
      <Card>
        <p className="text-sm text-slate-600">采购台账 parser 已支持多 sheet 搜索。当前样本中的采购登记台账多个 sheet 为空，上传有效明细后会自动入库。</p>
      </Card>
    </Shell>
  );
}
