export type UploadBusinessGroupKey = "finance" | "operations" | "marketing" | "inventory" | "reference";

export type UploadBusinessGroup = {
  key: UploadBusinessGroupKey;
  label: string;
  description: string;
  order: number;
};

export type UploadPreviewLike = {
  rowCounts?: Record<string, number>;
  qualityIssueCount?: number | null;
};

export type UploadBatchLike = {
  id: string;
  status?: string | null;
  reportType?: string | null;
  active?: boolean | null;
};

export type UploadFilterBatchLike = UploadBatchLike & {
  active?: boolean | null;
  fileName?: string | null;
  projectCode?: string | null;
  qualityIssueCount?: number | null;
};

export type UploadFilters = {
  projectCode?: string | null;
  group?: string | null;
  status?: string | null;
  query?: string | null;
  quality?: string | null;
};

export type UploadReturnExtras = {
  batchId?: string | null;
  batchIds?: string | null;
};

export type BatchConfirmFailure = {
  id: string;
  message: string;
};

const groups: Record<UploadBusinessGroupKey, UploadBusinessGroup> = {
  finance: {
    key: "finance",
    label: "资金财务",
    description: "财报、资金收支、现金流、应收应付",
    order: 1
  },
  operations: {
    key: "operations",
    label: "经营销售",
    description: "经营日报、管报、运营日报、客服日报",
    order: 2
  },
  marketing: {
    key: "marketing",
    label: "推广投放",
    description: "天猫、京东、抖音、小红书等投放日报",
    order: 3
  },
  inventory: {
    key: "inventory",
    label: "库存采购",
    description: "商品日报、库存周转、采购台账、未提货",
    order: 4
  },
  reference: {
    key: "reference",
    label: "资料留存",
    description: "HTML 看板、飞书快捷链接、解析失败文件",
    order: 5
  }
};

export function getUploadBusinessGroup(reportType?: string | null, fileName = ""): UploadBusinessGroup {
  if (reportType === "finance") return groups.finance;
  if (reportType === "management" || reportType === "sales") return groups.operations;
  if (reportType === "promotion") return groups.marketing;
  if (reportType === "inventory" || reportType === "purchase") return groups.inventory;
  if (/资金|财报|现金|应收|应付/.test(fileName)) return groups.finance;
  if (/经营|管报|销售|运营|客服|店铺/.test(fileName)) return groups.operations;
  if (/推广|投放|ROI|roi/.test(fileName)) return groups.marketing;
  if (/商品|库存|采购|未提货|仓/.test(fileName)) return groups.inventory;
  return groups.reference;
}

export function getUploadBusinessGroups() {
  return Object.values(groups).sort((a, b) => a.order - b.order);
}

export function summarizeUploadPreview(preview?: UploadPreviewLike | null) {
  const rowCount = Object.values(preview?.rowCounts ?? {}).reduce((sum, item) => sum + (Number(item) || 0), 0);
  const qualityIssueCount = Number(preview?.qualityIssueCount ?? 0);
  const statusText = rowCount > 0 && qualityIssueCount === 0 ? "可入库" : "需复核";
  return { rowCount, qualityIssueCount, statusText };
}

export function serializeUploadBatchIds(batchIds: string[]) {
  return Array.from(new Set(batchIds.map((id) => id.trim()).filter(Boolean))).join(",");
}

export function parseUploadBatchIds(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return serializeUploadBatchIds(values.flatMap((item) => item.split(","))).split(",").filter(Boolean);
}

export function getConfirmableUploadBatchIds(batches: UploadBatchLike[]) {
  return batches.filter(canConfirmUploadBatch).map((batch) => batch.id);
}

export function canConfirmUploadBatch(batch: UploadBatchLike) {
  return batch.status === "parsed" && Boolean(batch.reportType);
}

export function canRollbackUploadBatch(batch: UploadBatchLike) {
  return batch.status === "imported" && !batch.active;
}

export function buildBatchConfirmRedirectParams(result: { imported: string[]; failed: BatchConfirmFailure[] }) {
  const params = new URLSearchParams();
  if (result.imported.length) {
    params.set("batchId", result.imported[0]);
    params.set("confirmed", String(result.imported.length));
    params.set("batchIds", serializeUploadBatchIds(result.imported));
  } else if (result.failed[0]) {
    params.set("batchId", result.failed[0].id);
  }
  if (result.failed.length) {
    params.set("failed", String(result.failed.length));
    params.set("error", result.failed.map((item) => `${item.id}: ${item.message}`).join("；").slice(0, 500));
  }
  return params;
}

export function filterUploadBatches<T extends UploadFilterBatchLike>(batches: T[], filters: UploadFilters) {
  const projectCode = cleanFilter(filters.projectCode);
  const group = cleanFilter(filters.group);
  const status = cleanFilter(filters.status);
  const quality = cleanFilter(filters.quality);
  const query = cleanFilter(filters.query)?.toLowerCase();
  return batches.filter((batch) => {
    if (projectCode && batch.projectCode !== projectCode) return false;
    if (group && getUploadBusinessGroup(batch.reportType, batch.fileName ?? "").key !== group) return false;
    if (status === "active" && !batch.active) return false;
    if (status && status !== "active" && batch.status !== status) return false;
    if (quality === "clean" && Number(batch.qualityIssueCount ?? 0) > 0) return false;
    if (quality === "issues" && Number(batch.qualityIssueCount ?? 0) <= 0) return false;
    if (query && !(batch.fileName ?? "").toLowerCase().includes(query)) return false;
    return true;
  });
}

function cleanFilter(value?: string | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned && cleaned !== "all" ? cleaned : null;
}

export function buildUploadReturnTo(filters: UploadFilters, extras: UploadReturnExtras = {}) {
  const params = new URLSearchParams();
  const projectCode = cleanFilter(filters.projectCode);
  const group = cleanFilter(filters.group);
  const status = cleanFilter(filters.status);
  const quality = cleanFilter(filters.quality);
  const query = cleanFilter(filters.query);
  if (projectCode) params.set("project", projectCode);
  if (group) params.set("group", group);
  if (status) params.set("status", status);
  if (quality) params.set("quality", quality);
  if (query) params.set("q", query);
  if (extras.batchId) params.set("batchId", extras.batchId);
  if (extras.batchIds) params.set("batchIds", extras.batchIds);
  const queryString = params.toString();
  return queryString ? `/uploads?${queryString}` : "/uploads";
}

export function appendUploadResultParams(returnTo: string, result: URLSearchParams) {
  const url = new URL(returnTo.startsWith("/") ? `http://local${returnTo}` : "http://local/uploads");
  result.forEach((value, key) => url.searchParams.set(key, value));
  return `${url.pathname}?${url.searchParams.toString()}`;
}
