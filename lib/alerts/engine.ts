import { parseNumber, todayUtcDate } from "@/lib/utils";
import type { ParsedFile, QualityIssue } from "@/lib/parsers";

export type AlertCandidate = {
  code: string;
  severity: "red" | "orange" | "yellow" | "info";
  title: string;
  message: string;
  metricValue?: number | null;
  payload?: Record<string, unknown>;
};

export const defaultAlertRules = [
  { code: "cash_support_days_lt_30", name: "现金流可支撑天数 < 30天", severity: "red", metric: "supportDays", operator: "lt", threshold: 30 },
  { code: "operating_cashflow_2w_negative", name: "连续2周经营现金流为负", severity: "orange", metric: "operatingCashflow", operator: "streak_lt", threshold: 0 },
  { code: "payables_due_7d_high", name: "应付账款7天内到期金额过高", severity: "red", metric: "payablesDue7d", operator: "gt", threshold: 100000 },
  { code: "sku_available_days_lt_14", name: "SKU可售天数 < 14天", severity: "yellow", metric: "turnoverDays", operator: "lt", threshold: 14 },
  { code: "sku_turnover_days_gt_120", name: "SKU周转天数 > 120天", severity: "orange", metric: "turnoverDays", operator: "gt", threshold: 120 },
  { code: "sku_no_sales_30d", name: "近30天销量=0且库存金额超过阈值", severity: "orange", metric: "sales30d", operator: "eq", threshold: 0 },
  { code: "sales_progress_risk", name: "时间进度超过70%且销售完成率低于60%", severity: "orange", metric: "completionRate", operator: "lt", threshold: 0.6 },
  { code: "promotion_roi_3d_low", name: "推广ROI连续3天低于目标ROI", severity: "orange", metric: "roi", operator: "streak_lt", threshold: 1.5 },
  { code: "data_quality", name: "上传文件存在数据质量问题", severity: "red", metric: "qualityIssueCount", operator: "gt", threshold: 0 }
] as const;

export function evaluateParsedFile(parsed: ParsedFile): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  for (const issue of parsed.qualityIssues) {
    alerts.push(fromQualityIssue(issue));
  }

  for (const row of parsed.inventorySkuRows) {
    const turnoverDays = parseNumber(row.turnoverDays);
    const inventoryAmount = parseNumber(row.inventoryAmount) ?? 0;
    const sales30d = parseNumber(row.sales30d);
    const sku = String(row.sku ?? row.productName ?? "未知SKU");
    if (turnoverDays !== null && turnoverDays < 14) {
      alerts.push({
        code: "sku_available_days_lt_14",
        severity: "yellow",
        title: "低库存预警",
        message: `${sku} 可售/周转天数 ${turnoverDays.toFixed(1)} 天，低于 14 天。`,
        metricValue: turnoverDays,
        payload: { row }
      });
    }
    if (turnoverDays !== null && turnoverDays > 120) {
      alerts.push({
        code: "sku_turnover_days_gt_120",
        severity: "orange",
        title: "滞销预警",
        message: `${sku} 周转天数 ${turnoverDays.toFixed(1)} 天，高于 120 天。`,
        metricValue: turnoverDays,
        payload: { row }
      });
    }
    if (sales30d === 0 && inventoryAmount > 10000) {
      alerts.push({
        code: "sku_no_sales_30d",
        severity: "orange",
        title: "不动销预警",
        message: `${sku} 近30天销量为0，库存金额 ${inventoryAmount.toFixed(0)}。`,
        metricValue: inventoryAmount,
        payload: { row }
      });
    }
  }

  const cash = parsed.cashflowSnapshots[0];
  const supportDays = parseNumber(cash?.supportDays);
  if (supportDays !== null && supportDays < 30) {
    alerts.push({
      code: "cash_support_days_lt_30",
      severity: "red",
      title: "现金流红色预警",
      message: `现金流可支撑天数为 ${supportDays.toFixed(1)} 天，低于 30 天。`,
      metricValue: supportDays
    });
  }

  const invalidPromotionRows = parsed.promotionDailyRows.filter((row) => row.isValid === false).length;
  if (invalidPromotionRows) {
    alerts.push({
      code: "data_quality",
      severity: "red",
      title: "推广数据质量预警",
      message: `推广文件中有 ${invalidPromotionRows} 行包含公式错误或无效指标，已阻止作为有效指标入库。`,
      metricValue: invalidPromotionRows
    });
  }

  return alerts.slice(0, 200);
}

function fromQualityIssue(issue: QualityIssue): AlertCandidate {
  return {
    code: "data_quality",
    severity: issue.severity,
    title: "数据质量预警",
    message: issue.sheet || issue.cell ? `${issue.message}（${issue.sheet ?? ""} ${issue.cell ?? ""}）` : issue.message,
    payload: { issue },
    metricValue: 1
  };
}

export function alertReportDate() {
  return todayUtcDate();
}
