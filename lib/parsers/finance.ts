import { monthStart, parseNumber } from "@/lib/utils";
import type { ParsedFile } from "@/lib/parsers/types";
import { findCellValue, firstSheetMatching, sheetObjects, sheetRows } from "@/lib/parsers/workbook";
import type * as XLSX from "xlsx";

export function parseFinance(workbook: XLSX.WorkBook, parsed: ParsedFile) {
  const balanceSheet = firstSheetMatching(workbook, /资产负债表/);
  const profitSheet = firstSheetMatching(workbook, /利润表/);
  const cashflowSheet = firstSheetMatching(workbook, /现金流量表/);
  const ledgerSheet = firstSheetMatching(workbook, /科余表/);
  const paymentSheet = firstSheetMatching(workbook, /支付明细/);

  if (balanceSheet) {
    const rows = sheetRows(workbook, balanceSheet, 120);
    const monetaryFunds = findCellValue(rows, /^货币资金$/);
    const receivables = findCellValue(rows, /^应收账款$/);
    const prepayments = findCellValue(rows, /^预付款项$/);
    const payables = findCellValue(rows, /^应付账款$/, 4) ?? findCellValue(rows, /^应付账款$/);
    for (const row of rows) {
      const left = String(row[0] ?? "").trim();
      const right = String(row[3] ?? "").trim();
      if (left) {
        parsed.balanceSheetItems.push({
          itemName: left,
          endingBalance: parseNumber(row[1]),
          openingBalance: parseNumber(row[2]),
          side: "asset",
          rawRow: row
        });
      }
      if (right) {
        parsed.balanceSheetItems.push({
          itemName: right,
          endingBalance: parseNumber(row[4]),
          openingBalance: parseNumber(row[5]),
          side: "liability",
          rawRow: row
        });
      }
    }
    parsed.financeSnapshots.push({ monetaryFunds, receivables, prepayments, payables, rawMetrics: { sheet: balanceSheet } });
  }

  if (profitSheet) {
    const rows = sheetRows(workbook, profitSheet, 120);
    const header = rows[2] ?? [];
    rows.slice(3).forEach((row) => {
      const itemName = String(row[0] ?? "").trim();
      if (!itemName) return;
      header.slice(1).forEach((label, idx) => {
        const amount = parseNumber(row[idx + 1]);
        if (amount === null) return;
        const month = String(label ?? "");
        parsed.profitItems.push({ itemName, amount, monthLabel: month, rawRow: row });
      });
    });
    const revenue = findCellValue(rows, /营业收入|营业总收入/, 5) ?? findCellValue(rows, /营业收入|营业总收入/);
    const netProfit = findCellValue(rows, /净利润/, 5) ?? findCellValue(rows, /净利润/);
    Object.assign(parsed.financeSnapshots[0] ?? (parsed.financeSnapshots[0] = {}), { revenue, netProfit });
  }

  if (cashflowSheet) {
    const rows = sheetRows(workbook, cashflowSheet, 120);
    const operatingCashflow = findCellValue(rows, /经营活动产生的现金流量净额/, 5) ?? findCellValue(rows, /经营活动产生的现金流量净额/);
    const endingCash = findCellValue(rows, /期末现金|现金及现金等价物余额/, 5) ?? findCellValue(rows, /期末现金|现金及现金等价物余额/);
    parsed.cashflowSnapshots.push({ operatingCashflow, endingCash, rawMetrics: { sheet: cashflowSheet } });
    Object.assign(parsed.financeSnapshots[0] ?? (parsed.financeSnapshots[0] = {}), { endingCash });
  }

  if (ledgerSheet) {
    const rows = sheetObjects(workbook, ledgerSheet, 0, 5000);
    for (const row of rows) {
      const subject = String(row["科目"] ?? row["科目描述"] ?? "");
      if (!/(应收|应付|预付|其他应收|其他应付)/.test(subject)) continue;
      parsed.receivablePayableItems.push({
        itemType: subject.includes("应付") ? "payable" : subject.includes("预付") ? "prepayment" : "receivable",
        counterparty: row["客户描述"] ?? row["供应商描述"],
        subjectCode: row["科目"],
        subjectName: row["科目描述"],
        endingAmount: parseNumber(row["期末金额"]),
        rawRow: row
      });
    }
  }

  if (paymentSheet) {
    const rows = sheetRows(workbook, paymentSheet, 20);
    const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? "").includes("交易日")));
    if (headerIndex >= 0) {
      for (const row of sheetObjects(workbook, paymentSheet, headerIndex, 3000)) {
        if (!row["交易日"]) continue;
        parsed.paymentTransactions.push({
          reportDate: row["交易日"],
          accountName: row["账号名称"],
          transactionType: row["交易类型"],
          debitAmount: parseNumber(row["借方金额"]),
          creditAmount: parseNumber(row["贷方金额"]),
          balance: parseNumber(row["余额"]),
          summary: row["摘要"] ?? row["用途"],
          counterparty: row["收(付)方名称"],
          rawRow: row
        });
      }
    }
  }

  const first = parsed.financeSnapshots[0];
  if (first) {
    parsed.summary.finance = first;
    parsed.financeSnapshots = [{ ...first, reportMonth: monthStart(parsed.reportMonth.getUTCFullYear(), parsed.reportMonth.getUTCMonth() + 1) }];
  }
  return parsed;
}

export const financeParser = parseFinance;
