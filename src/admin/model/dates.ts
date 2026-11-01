/**
 * IST date, month and financial-year helpers. India has no DST, so IST is a fixed UTC+05:30.
 * Business dates are `YYYY-MM-DD` strings; arithmetic is done on UTC midnights of those dates.
 */
import type { FY, ISODate, ISOMonth } from './types';

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The IST calendar date of an instant. */
export function toISTDate(instant: Date): ISODate {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today in Asia/Kolkata. */
export function todayIST(now: Date = new Date()): ISODate {
  return toISTDate(now);
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isISOMonth(value: unknown): value is ISOMonth {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function utc(date: ISODate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(utc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
export function isoWeekday(date: ISODate): number {
  const d = new Date(utc(date)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function monthOf(date: ISODate): ISOMonth {
  return date.slice(0, 7);
}

export function addMonths(month: ISOMonth, n: number): ISOMonth {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthStart(month: ISOMonth): ISODate {
  return `${month}-01`;
}

export function monthEnd(month: ISOMonth): ISODate {
  return addDays(monthStart(addMonths(month, 1)), -1);
}

/** Months from `from` to `to` inclusive. */
export function monthsBetween(from: ISOMonth, to: ISOMonth): ISOMonth[] {
  const out: ISOMonth[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** Financial year (1 Apr – 31 Mar) of a date, labelled `2026-27`. */
export function fyOf(date: ISODate): FY {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function fyStartYear(fy: FY): number {
  return Number(fy.slice(0, 4));
}

export function fyRange(fy: FY): { from: ISODate; to: ISODate } {
  const y = fyStartYear(fy);
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

export function addFy(fy: FY, n: number): FY {
  return fyOf(`${fyStartYear(fy) + n}-04-01`);
}

/** `2026-11-01` → `1 Nov 2026`. */
export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** `2026-11` → `November 2026`. */
export function formatMonth(month: ISOMonth): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** `2026-11` → `Nov 2026` (chart ticks). */
export function formatMonthShort(month: ISOMonth): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** Inclusive range check on ISO dates (string comparison is safe for `YYYY-MM-DD`). */
export function inRange(date: ISODate, from?: ISODate, to?: ISODate): boolean {
  return (!from || date >= from) && (!to || date <= to);
}
