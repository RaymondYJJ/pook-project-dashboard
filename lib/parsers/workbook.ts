import * as XLSX from "xlsx";
import { parseNumber } from "@/lib/utils";
import type { QualityIssue } from "@/lib/parsers/types";

export type RowObject = Record<string, unknown>;

const formulaErrorTokens = ["#REF!", "#DIV/0!", "#VALUE!", "#NAME?", "#N/A", "#NULL!", "#NUM!"];

export function readWorkbook(buffer: Buffer) {
  return XLSX.read(buffer, { type: "buffer", cellDates: true, cellFormula: true, dense: false });
}

export function sheetRows(workbook: XLSX.WorkBook, sheetName: string, range = 5000): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const ref = sheet["!ref"];
  if (!ref) return [];
  const decoded = XLSX.utils.decode_range(ref);
  const bounded = {
    s: decoded.s,
    e: {
      r: Math.min(decoded.e.r, decoded.s.r + range - 1),
      c: Math.min(decoded.e.c, decoded.s.c + 120)
    }
  };
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false, range: bounded }) as unknown[][];
}

export function sheetObjects(workbook: XLSX.WorkBook, sheetName: string, headerRowIndex = 0, maxRows = 10000): RowObject[] {
  const rows = sheetRows(workbook, sheetName, maxRows + headerRowIndex + 1);
  const headers = (rows[headerRowIndex] ?? []).map((v) => String(v ?? "").trim());
  return rows.slice(headerRowIndex + 1).map((row) => {
    const obj: RowObject = {};
    headers.forEach((header, index) => {
      if (!header) return;
      obj[header] = row[index];
    });
    return obj;
  });
}

export function findHeaderRow(rows: unknown[][], keywords: string[]) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 80).forEach((row, index) => {
    const joined = row.map((v) => String(v ?? "")).join("|").toLowerCase();
    const score = keywords.reduce((total, keyword) => total + (joined.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    const nonEmpty = row.filter((v) => String(v ?? "").trim()).length;
    if (nonEmpty >= 3 && score > best.score) best = { index, score };
  });
  return best.index;
}

export function findCellValue(rows: unknown[][], label: RegExp, valueOffset = 1): number | null {
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (label.test(String(row[index] ?? ""))) {
        return parseNumber(row[index + valueOffset]);
      }
    }
  }
  return null;
}

export function rowValue(row: RowObject, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const hit = entries.find(([key]) => key.replace(/\s/g, "").includes(alias));
    if (hit) return hit[1];
  }
  return null;
}

export function rowNumber(row: RowObject, aliases: string[]) {
  return parseNumber(rowValue(row, aliases));
}

export function detectFormulaIssues(workbook: XLSX.WorkBook): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const [addr, cell] of Object.entries(sheet)) {
      if (addr.startsWith("!")) continue;
      const value = [cell.v, cell.w, cell.f].filter(Boolean).join(" ");
      const token = formulaErrorTokens.find((item) => value.includes(item));
      if (token) {
        issues.push({
          code: "FORMULA_ERROR",
          severity: "red",
          message: `公式错误 ${token}，该指标不会作为有效值入库。`,
          sheet: sheetName,
          cell: addr,
          value
        });
      }
    }
  }
  return issues;
}

export function parseDateValue(value: unknown, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return fallback;
}

export function firstSheetMatching(workbook: XLSX.WorkBook, pattern: RegExp) {
  return workbook.SheetNames.find((name) => pattern.test(name));
}
