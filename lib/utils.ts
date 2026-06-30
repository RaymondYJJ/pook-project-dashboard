import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

export function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  const normalized = Math.abs(value) > 1 ? value / 100 : value;
  return `${(normalized * 100).toFixed(1)}%`;
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[￥¥]/g, "")
    .trim();
  if (!raw || raw === "-" || raw === "--") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return String(value).includes("%") ? parsed / 100 : parsed;
}

export function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function inferProjectFromName(name: string): "taiyue" | "luxueya" {
  if (/太樾|璞樾/.test(name)) return "taiyue";
  return "luxueya";
}

export function inferReportMonthFromName(name: string) {
  const year = name.match(/20\d{2}/)?.[0];
  const month = name.match(/(?:\.|-|年)?(0?[1-9]|1[0-2])月/)?.[1] ?? name.match(/1-([1-9]|1[0-2])月/)?.[1];
  return monthStart(Number(year ?? 2026), Number(month ?? 6));
}

export function inferReportDateFromName(name: string) {
  const year = Number(name.match(/20\d{2}/)?.[0] ?? 2026);
  const compactMonthDay = name.match(/(?:^|[^\d])([01]\d)([0-3]\d)(?:[^\d]|$)/);
  if (compactMonthDay) return new Date(Date.UTC(year, Number(compactMonthDay[1]) - 1, Number(compactMonthDay[2])));
  const monthDay = name.match(/(?:^|[^\d])([01]?\d)[.-]([0-3]?\d)(?!月)(?:[^\d]|$)/);
  if (monthDay) return new Date(Date.UTC(year, Number(monthDay[1]) - 1, Number(monthDay[2])));
  const chinese = name.match(/(?:20\d{2}年)?([01]?\d)月([0-3]?\d)[日号]?/);
  if (chinese) return new Date(Date.UTC(year, Number(chinese[1]) - 1, Number(chinese[2])));
  return inferReportMonthFromName(name);
}

export function todayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
