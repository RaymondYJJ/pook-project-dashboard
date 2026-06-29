export type ParserType = "finance" | "management" | "sales" | "promotion" | "inventory" | "purchase" | "html-dashboard" | "unknown";

export type QualityIssue = {
  code: string;
  severity: "red" | "orange" | "yellow" | "info";
  message: string;
  sheet?: string;
  cell?: string;
  row?: number;
  field?: string;
  value?: unknown;
};

export type ParsedFile = {
  parserType: ParserType;
  projectCode: "taiyue" | "luxueya";
  reportMonth: Date;
  reportDate: Date;
  summary: Record<string, unknown>;
  qualityIssues: QualityIssue[];
  financeSnapshots: Record<string, unknown>[];
  cashflowSnapshots: Record<string, unknown>[];
  balanceSheetItems: Record<string, unknown>[];
  profitItems: Record<string, unknown>[];
  receivablePayableItems: Record<string, unknown>[];
  paymentTransactions: Record<string, unknown>[];
  managementReportRows: Record<string, unknown>[];
  salesDailyRows: Record<string, unknown>[];
  promotionDailyRows: Record<string, unknown>[];
  inventorySnapshots: Record<string, unknown>[];
  inventorySkuRows: Record<string, unknown>[];
  purchaseRows: Record<string, unknown>[];
};

export function emptyParsedFile(init: Pick<ParsedFile, "parserType" | "projectCode" | "reportMonth" | "reportDate">): ParsedFile {
  return {
    ...init,
    summary: {},
    qualityIssues: [],
    financeSnapshots: [],
    cashflowSnapshots: [],
    balanceSheetItems: [],
    profitItems: [],
    receivablePayableItems: [],
    paymentTransactions: [],
    managementReportRows: [],
    salesDailyRows: [],
    promotionDailyRows: [],
    inventorySnapshots: [],
    inventorySkuRows: [],
    purchaseRows: []
  };
}
