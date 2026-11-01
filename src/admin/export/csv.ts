/**
 * Shared CSV writer (Payments Ledger, Clients/DMCs, Bookings table): UTF-8 with BOM (Excel), RFC 4180 quoting, CRLF.
 * Formula-injection guard: a text cell starting with `=`, `+`, `-`, `@`, tab or CR gets a `'` prefix.
 * Numbers (INR integers, counts) are written as-is, so a negative Signed amount stays a number.
 */

export type CsvCell = string | number | null | undefined;
export type CsvRow = readonly CsvCell[];

export const CSV_BOM = '﻿';
const INJECTION_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = INJECTION_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** `header` + `rows` → CSV text with BOM; every record (incl. the last) ends in CRLF. */
export function toCsv(header: readonly string[], rows: readonly CsvRow[]): string {
  return CSV_BOM + [header, ...rows].map((row) => `${row.map(csvCell).join(',')}\r\n`).join('');
}

/** Columns + row mapper → CSV text. */
export type CsvColumn<T> = { header: string; value: (item: T) => CsvCell };

export function csvFrom<T>(columns: readonly CsvColumn<T>[], items: readonly T[]): string {
  return toCsv(
    columns.map((c) => c.header),
    items.map((item) => columns.map((c) => c.value(item))),
  );
}
