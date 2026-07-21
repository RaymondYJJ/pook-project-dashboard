function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function chooseMonthSalesValue(input: {
  salesActualSales?: unknown;
  salesPaymentAmount?: unknown;
  managementGmv?: unknown;
}) {
  return toFiniteNumber(input.salesActualSales) ?? toFiniteNumber(input.salesPaymentAmount) ?? toFiniteNumber(input.managementGmv);
}

export function utcMonthRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}
