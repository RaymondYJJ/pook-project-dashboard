import { formatMoney } from "@/lib/utils";

export type ProjectSummary = {
  id: string;
  code: "taiyue" | "luxueya";
  name: string;
  entityName: string;
  todayGmv: number;
  monthGmv: number;
  completionRate: number;
  salesOutbound: number;
  projectProfit: number;
  cashBalance: number;
  receivables: number;
  payables: number;
  inventoryAmount: number;
  turnoverDays: number;
  alertCount: number;
};

export const fallbackProjects: ProjectSummary[] = [
  {
    id: "taiyue",
    code: "taiyue",
    name: "太樾项目经营状态",
    entityName: "璞樾",
    todayGmv: 0,
    monthGmv: 0,
    completionRate: 0,
    salesOutbound: 0,
    projectProfit: 0,
    cashBalance: 0,
    receivables: 0,
    payables: 0,
    inventoryAmount: 0,
    turnoverDays: 0,
    alertCount: 0
  },
  {
    id: "luxueya",
    code: "luxueya",
    name: "绿雪芽项目经营状态",
    entityName: "佰茶",
    todayGmv: 0,
    monthGmv: 0,
    completionRate: 0,
    salesOutbound: 0,
    projectProfit: 0,
    cashBalance: 0,
    receivables: 0,
    payables: 0,
    inventoryAmount: 0,
    turnoverDays: 0,
    alertCount: 0
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
    ["今日GMV", formatMoney(project.todayGmv)],
    ["本月GMV", formatMoney(project.monthGmv)],
    ["销售出库", formatMoney(project.salesOutbound)],
    ["项目利润", formatMoney(project.projectProfit)],
    ["现金余额", formatMoney(project.cashBalance)],
    ["库存金额", formatMoney(project.inventoryAmount)]
  ];
}
