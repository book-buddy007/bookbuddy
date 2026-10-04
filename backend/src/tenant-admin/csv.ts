/**
 * CSV for spreadsheet users. Two things matter beyond quoting:
 *  - Cells that start with = + - @ (or tab/CR) are prefixed with an apostrophe, because Excel and
 *    Sheets would otherwise run them as formulas. Names and titles here are user-entered.
 *  - A UTF-8 byte-order mark is prepended so Excel shows non-Latin names (Devanagari etc.) correctly.
 * Numbers are written as numbers; only strings get the formula guard.
 */
export type CsvCell = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  let text = value instanceof Date ? value.toISOString() : value;
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
