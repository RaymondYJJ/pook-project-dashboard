import type { AlertRule, AlertSeverity, Prisma } from "@prisma/client";
import { parseNumber, todayUtcDate } from "@/lib/utils";
import type { ParsedFile, QualityIssue } from "@/lib/parsers";

export type AlertCandidate = {
  code: string;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  metricValue?: number | null;
  threshold?: number | null;
  reason: string;
  suggestion: string;
  sourceLabel: string;
  ownerName?: string | null;
  alertRuleId?: string | null;
  payload?: Record<string, unknown>;
};

type RuleSeed = {
  code: string;
  alertType: string;
  name: string;
  severity: AlertSeverity;
  metric: string;
  operator: string;
  threshold: number;
  description: string;
  config: {
    ownerName: string;
    suggestion: string;
    sourceLabel: string;
  };
};

export const defaultAlertRules: RuleSeed[] = [
  rule("cash_support_days_lt_30", "cashflow", "现金流可支撑天数不足", "red", "supportDays", "lt", 30, "现金流可支撑天数低于阈值。", "财务", "复核现金余额、未来7日付款计划，并准备现金补充方案。", "财报/现金流量表"),
  rule("receivable_balance_high", "receivable", "应收账款余额过高", "orange", "receivables", "gt", 500000, "应收账款余额高于阈值。", "财务", "输出大额应收明细，确认账期、催收责任人与预计回款日。", "财报/资产负债表"),
  rule("payables_balance_high", "payable", "应付账款余额过高", "red", "payables", "gt", 500000, "应付账款余额高于阈值。", "财务", "梳理7日内刚性付款，明确缓付和优先支付清单。", "财报/资产负债表"),
  rule("sku_available_days_lt_14", "inventory_low", "库存低水位预警", "orange", "turnoverDays", "lt", 14, "SKU可售/周转天数低于阈值。", "运营", "确认补货、调拨或下架节奏，避免核心商品断货。", "商品日报/库存明细"),
  rule("inventory_turnover_days_gt_90", "inventory_high", "库存高水位预警", "yellow", "turnoverDays", "gt", 90, "SKU库存周转天数高于高水位阈值。", "运营", "检查库存结构，制定促销、组合销售或采购收缩动作。", "商品日报/库存明细"),
  rule("sku_turnover_days_gt_120", "slow_moving", "滞销预警", "orange", "turnoverDays", "gt", 120, "SKU周转天数高于滞销阈值。", "运营", "标记滞销SKU，评估清仓、换赠品、渠道转移或停止采购。", "商品日报/库存明细"),
  rule("sku_no_sales_30d", "no_sales", "不动销预警", "orange", "sales30d", "eq", 0, "SKU近30天销量为0且库存金额超过阈值。", "运营", "核查商品状态、页面曝光和库存可售性，制定去化动作。", "商品日报/库存明细"),
  rule("sales_completion_rate_low", "sales_target", "渠道销售目标预警", "orange", "completionRate", "lt", 0.6, "销售完成率低于阈值。", "运营", "拆解渠道缺口，调整投放、直播、活动和货盘。", "销售日报"),
  rule("promotion_roi_low", "promotion_roi", "推广ROI预警", "yellow", "roi", "lt", 1.5, "推广ROI低于目标阈值。", "运营", "暂停低效计划，复核素材、人群、出价和转化链路。", "推广日报"),
  rule("data_quality", "data_quality", "数据质量预警", "red", "qualityIssueCount", "gt", 0, "源文件存在公式错误、空字段、缺字段或重复日期。", "数据", "退回数据源修正公式和缺失字段，重新上传确认版本。", "上传解析预览")
];

export async function evaluateParsedFile(parsed: ParsedFile, rules: AlertRule[] = []): Promise<AlertCandidate[]> {
  const activeRules = rules.length ? rules : defaultAlertRules.map((item) => item as unknown as AlertRule);
  const byCode = new Map(activeRules.filter((item) => item.isActive !== false).map((item) => [item.code, item]));
  const alerts: AlertCandidate[] = [];

  const qualityRule = byCode.get("data_quality");
  if (qualityRule) {
    for (const issue of parsed.qualityIssues.slice(0, 80)) alerts.push(fromQualityIssue(issue, qualityRule));
  }

  const finance = parsed.financeSnapshots[0];
  maybeAdd(alerts, byCode.get("cash_support_days_lt_30"), parseNumber(parsed.cashflowSnapshots[0]?.supportDays), "现金流预警", "现金流可支撑天数低于规则阈值。");
  maybeAdd(alerts, byCode.get("receivable_balance_high"), parseNumber(finance?.receivables), "应收预警", "应收账款余额超过规则阈值。");
  maybeAdd(alerts, byCode.get("payables_balance_high"), parseNumber(finance?.payables), "应付预警", "应付账款余额超过规则阈值。");

  const salesRule = byCode.get("sales_completion_rate_low");
  if (salesRule) {
    const sales = parsed.salesDailyRows.reduce((sum, row) => sum + (parseNumber(row.actualSales) ?? parseNumber(row.paymentAmount) ?? 0), 0);
    const target = parsed.salesDailyRows.reduce((sum, row) => sum + (parseNumber(row.gmvTarget) ?? 0), 0);
    if (target > 0) maybeAdd(alerts, salesRule, sales / target, "渠道销售目标预警", "销售完成率低于规则阈值。");
  }

  for (const row of parsed.inventorySkuRows) {
    const turnoverDays = parseNumber(row.turnoverDays);
    const inventoryAmount = parseNumber(row.inventoryAmount) ?? 0;
    const sales30d = parseNumber(row.sales30d);
    const sku = String(row.sku ?? row.productName ?? "未知SKU");
    maybeAdd(alerts, byCode.get("sku_available_days_lt_14"), turnoverDays, "库存低水位预警", `${sku} 可售/周转天数低于规则阈值。`, { row });
    maybeAdd(alerts, byCode.get("inventory_turnover_days_gt_90"), turnoverDays, "库存高水位预警", `${sku} 周转天数高于高水位阈值。`, { row });
    maybeAdd(alerts, byCode.get("sku_turnover_days_gt_120"), turnoverDays, "滞销预警", `${sku} 周转天数高于滞销阈值。`, { row });
    const noSalesRule = byCode.get("sku_no_sales_30d");
    const minInventoryAmount = Number((noSalesRule?.config as { minInventoryAmount?: number } | null)?.minInventoryAmount ?? 10000);
    if (noSalesRule && compare(sales30d, noSalesRule.operator, threshold(noSalesRule)) && inventoryAmount >= minInventoryAmount) {
      alerts.push(candidate(noSalesRule, "不动销预警", `${sku} 近30天销量为0，库存金额 ${inventoryAmount.toFixed(0)}。`, inventoryAmount, { row, minInventoryAmount }));
    }
  }

  const promotionRule = byCode.get("promotion_roi_low");
  if (promotionRule) {
    for (const row of parsed.promotionDailyRows) {
      const roi = parseNumber(row.roi);
      if (compare(roi, promotionRule.operator, threshold(promotionRule))) {
        alerts.push(candidate(promotionRule, "推广ROI预警", `${String(row.channel ?? row.campaign ?? "推广计划")} ROI 低于规则阈值。`, roi, { row }));
      }
    }
  }

  return alerts.slice(0, 300);
}

function rule(code: string, alertType: string, name: string, severity: AlertSeverity, metric: string, operator: string, threshold: number, description: string, ownerName: string, suggestion: string, sourceLabel: string): RuleSeed {
  return { code, alertType, name, severity, metric, operator, threshold, description, config: { ownerName, suggestion, sourceLabel } };
}

function maybeAdd(alerts: AlertCandidate[], ruleItem: AlertRule | undefined, value: number | null, title: string, reason: string, payload?: Record<string, unknown>) {
  if (!ruleItem || !compare(value, ruleItem.operator, threshold(ruleItem))) return;
  alerts.push(candidate(ruleItem, title, reason, value, payload));
}

function candidate(ruleItem: AlertRule, title: string, reason: string, value?: number | null, payload?: Record<string, unknown>): AlertCandidate {
  const config = (ruleItem.config ?? {}) as { ownerName?: string; suggestion?: string; sourceLabel?: string };
  const ruleThreshold = threshold(ruleItem);
  return {
    code: ruleItem.code,
    alertType: ruleItem.alertType,
    alertRuleId: "id" in ruleItem ? ruleItem.id : null,
    severity: ruleItem.severity,
    title,
    message: `${reason} 当前值 ${formatValue(value)}，阈值 ${formatValue(ruleThreshold)}。`,
    metric: ruleItem.metric,
    metricValue: value,
    threshold: ruleThreshold,
    reason,
    suggestion: config.suggestion ?? "请负责人复核数据并更新处理结论。",
    sourceLabel: config.sourceLabel ?? "已确认入库数据",
    ownerName: config.ownerName ?? null,
    payload
  };
}

function fromQualityIssue(issue: QualityIssue, ruleItem: AlertRule): AlertCandidate {
  const config = (ruleItem.config ?? {}) as { ownerName?: string; suggestion?: string; sourceLabel?: string };
  return {
    code: ruleItem.code,
    alertType: ruleItem.alertType,
    alertRuleId: "id" in ruleItem ? ruleItem.id : null,
    severity: issue.severity === "info" ? "yellow" : (issue.severity as AlertSeverity),
    title: "数据质量预警",
    message: issue.sheet || issue.cell ? `${issue.message}（${issue.sheet ?? ""} ${issue.cell ?? ""}）` : issue.message,
    metric: ruleItem.metric,
    metricValue: 1,
    threshold: threshold(ruleItem),
    reason: issue.message,
    suggestion: config.suggestion ?? "请修复源文件后重新上传确认版本。",
    sourceLabel: config.sourceLabel ?? "上传解析预览",
    ownerName: config.ownerName ?? null,
    payload: { issue }
  };
}

function threshold(ruleItem: AlertRule) {
  return Number(ruleItem.threshold ?? 0);
}

function compare(value: number | null, operator: string, ruleThreshold: number) {
  if (value === null || !Number.isFinite(value)) return false;
  if (operator === "lt") return value < ruleThreshold;
  if (operator === "lte") return value <= ruleThreshold;
  if (operator === "gt") return value > ruleThreshold;
  if (operator === "gte") return value >= ruleThreshold;
  if (operator === "eq") return value === ruleThreshold;
  return false;
}

function formatValue(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "待核实";
  return Math.abs(value) < 1 ? value.toFixed(2) : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function alertReportDate() {
  return todayUtcDate();
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
