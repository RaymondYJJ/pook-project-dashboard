import { Shell, PageHeader, Card } from "@/components/ui";
import { TrendChart } from "@/components/charts";

export default function PromotionPage() {
  return (
    <Shell>
      <PageHeader title="推广投放" description="花费、展现、点击、成交金额、ROI、CPC、点击率、转化率与加购成本" />
      <Card>
        <TrendChart data={[{ name: "D-6", 太樾: 1.2, 绿雪芽: 1.6 }, { name: "D-5", 太樾: 1.5, 绿雪芽: 1.8 }, { name: "D-4", 太樾: 0.9, 绿雪芽: 1.4 }, { name: "D-3", 太樾: 1.1, 绿雪芽: 1.9 }]} />
      </Card>
    </Shell>
  );
}
