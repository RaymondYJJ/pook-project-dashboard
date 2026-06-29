import { Shell, PageHeader, Card } from "@/components/ui";
import { ChannelBarChart } from "@/components/charts";

export default function SalesPage() {
  return (
    <Shell>
      <PageHeader title="渠道销售" description="按每日、渠道、店铺、商品层级追踪支付金额、GMV目标、达成率与转化指标" />
      <Card>
        <ChannelBarChart data={[{ name: "天猫", value: 120 }, { name: "京东", value: 86 }, { name: "抖音", value: 64 }, { name: "微信", value: 28 }, { name: "线下", value: 45 }]} />
      </Card>
    </Shell>
  );
}
