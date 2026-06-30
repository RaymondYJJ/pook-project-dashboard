import { formatMoney } from "@/lib/utils";

export type MetricDatum = {
  value: number | null;
  sourceDate: string | null;
  updatedAt: string | null;
};

export type ProjectSummary = {
  id: string;
  code: "taiyue" | "luxueya";
  name: string;
  entityName: string;
  todaySales: MetricDatum;
  monthSales: MetricDatum;
  completionRate: MetricDatum;
  salesOutbound: MetricDatum;
  projectProfit: MetricDatum;
  cashBalance: MetricDatum;
  receivables: MetricDatum;
  payables: MetricDatum;
  inventoryAmount: MetricDatum;
  turnoverDays: MetricDatum;
  alertCount: MetricDatum;
};

const emptyMetric: MetricDatum = { value: null, sourceDate: null, updatedAt: null };

export const fallbackProjects: ProjectSummary[] = [
  {
    id: "taiyue",
    code: "taiyue",
    name: "太樾项目经营状态",
    entityName: "璞樾",
    todaySales: emptyMetric,
    monthSales: emptyMetric,
    completionRate: emptyMetric,
    salesOutbound: emptyMetric,
    projectProfit: emptyMetric,
    cashBalance: emptyMetric,
    receivables: emptyMetric,
    payables: emptyMetric,
    inventoryAmount: emptyMetric,
    turnoverDays: emptyMetric,
    alertCount: emptyMetric
  },
  {
    id: "luxueya",
    code: "luxueya",
    name: "绿雪芽项目经营状态",
    entityName: "佰茶",
    todaySales: emptyMetric,
    monthSales: emptyMetric,
    completionRate: emptyMetric,
    salesOutbound: emptyMetric,
    projectProfit: emptyMetric,
    cashBalance: emptyMetric,
    receivables: emptyMetric,
    payables: emptyMetric,
    inventoryAmount: emptyMetric,
    turnoverDays: emptyMetric,
    alertCount: emptyMetric
  }
];

export const demoTrend = [
  { name: "1月", 太樾: 10, 绿雪芽: 12 },
  { name: "2月", 太樾: 16, 绿雪芽: 18 },
  { name: "3月", 太樾: 12, 绿雪芽: 15 },
  { name: "4月", 太樾: 20, 绿雪芽: 16 },
  { name: "5月", 太樾: 24, 绿雪芽: 21 },
  { name: "6月", 太樾: 18, 绿雪芽: 25 }
];

export function kpiRows(project: ProjectSummary) {
  return [
    ["今日GMV", formatMoney(project.todaySales.value)],
    ["本月GMV", formatMoney(project.monthSales.value)],
    ["销售出库", formatMoney(project.salesOutbound.value)],
    ["项目利润", formatMoney(project.projectProfit.value)],
    ["现金余额", formatMoney(project.cashBalance.value)],
    ["库存金额", formatMoney(project.inventoryAmount.value)]
  ];
}
