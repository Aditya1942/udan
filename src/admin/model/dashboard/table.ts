/**
 * Bookings table: search, filters, sort, footer totals and URL (de)serialisation.
 * The table is the Booking list; all state lives in URL query params.
 */
import { isISODate, isISOMonth, monthOf } from '../dates';
import { totals, type Totals } from '../counting';
import { BOOKING_STATUSES, LINE_TYPES, type BookingStatus, type ISODate, type ISOMonth, type LineType } from '../types';
import type { BookingRow } from './rows';

export const CLIENT_PAYMENT_FILTERS = ['paid', 'outstanding', 'overdue', 'refund'] as const;
/** Fully paid / Outstanding / Overdue / Refund owed. */
export type ClientPaymentFilter = (typeof CLIENT_PAYMENT_FILTERS)[number];

export const DMC_PAYMENT_FILTERS = ['paid', 'outstanding', 'due7', 'overdue'] as const;
/** Fully paid / Outstanding / Due in 7 days / Overdue. */
export type DmcPaymentFilter = (typeof DMC_PAYMENT_FILTERS)[number];

export const DATE_FIELDS = ['travelStart', 'travelEnd', 'bookedOn'] as const;
export type DateField = (typeof DATE_FIELDS)[number];

export const SORT_KEYS = [
  'bookingNo',
  'client',
  'destination',
  'travelStart',
  'status',
  'sellingPrice',
  'outstanding',
  'commission',
  'bookedOn',
] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';

export type TableQuery = {
  /** `month` = Bookings whose travelStart falls in `month`; overridden by a date range. */
  scope: 'month' | 'all';
  month: ISOMonth;
  q: string;
  status: BookingStatus[];
  dateField: DateField;
  from?: ISODate;
  to?: ISODate;
  clientId?: string;
  dmcIds: string[];
  lineTypes: LineType[];
  clientPayment?: ClientPaymentFilter;
  dmcPayment?: DmcPaymentFilter;
  invoice?: 'generated' | 'none';
  /** Only "Travel ended, not Completed". */
  travelEnded: boolean;
  sort: SortKey;
  dir: SortDir;
};

export function defaultTableQuery(today: ISODate): TableQuery {
  return {
    scope: 'month',
    month: monthOf(today),
    q: '',
    status: [],
    dateField: 'travelStart',
    dmcIds: [],
    lineTypes: [],
    travelEnded: false,
    sort: 'travelStart',
    dir: 'asc',
  };
}

/** True when a date range is set (it overrides the month scope). */
export function hasDateRange(q: Pick<TableQuery, 'from' | 'to'>): boolean {
  return !!(q.from || q.to);
}

/** Number of active advanced filters (chips). Search, scope and sort don't count. */
export function activeFilterCount(q: TableQuery): number {
  return (
    (q.status.length ? 1 : 0) +
    (hasDateRange(q) ? 1 : 0) +
    (q.clientId ? 1 : 0) +
    (q.dmcIds.length ? 1 : 0) +
    (q.lineTypes.length ? 1 : 0) +
    (q.clientPayment ? 1 : 0) +
    (q.dmcPayment ? 1 : 0) +
    (q.invoice ? 1 : 0) +
    (q.travelEnded ? 1 : 0)
  );
}

/** Same query with every advanced filter removed ("Clear all"). */
export function clearFilters(q: TableQuery): TableQuery {
  return {
    ...q,
    status: [],
    from: undefined,
    to: undefined,
    clientId: undefined,
    dmcIds: [],
    lineTypes: [],
    clientPayment: undefined,
    dmcPayment: undefined,
    invoice: undefined,
    travelEnded: false,
  };
}

/* ---------------- URL params ---------------- */

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const oneOf = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

/** Parses `?month=&scope=&q=&status=&date=&from=&to=&client=&dmc=&type=&cpay=&dpay=&inv=&flag=&sort=&dir=`. */
export function parseTableQuery(params: URLSearchParams, today: ISODate): TableQuery {
  const d = defaultTableQuery(today);
  const month = params.get('month');
  const from = params.get('from');
  const to = params.get('to');
  return {
    scope: params.get('scope') === 'all' ? 'all' : 'month',
    month: isISOMonth(month) ? month : d.month,
    q: params.get('q') ?? '',
    status: list(params.get('status')).filter((s): s is BookingStatus => (BOOKING_STATUSES as readonly string[]).includes(s)),
    dateField: oneOf(params.get('date'), DATE_FIELDS) ?? d.dateField,
    from: isISODate(from) ? from : undefined,
    to: isISODate(to) ? to : undefined,
    clientId: params.get('client') || undefined,
    dmcIds: list(params.get('dmc')),
    lineTypes: list(params.get('type')).filter((t): t is LineType => (LINE_TYPES as readonly string[]).includes(t)),
    clientPayment: oneOf(params.get('cpay'), CLIENT_PAYMENT_FILTERS),
    dmcPayment: oneOf(params.get('dpay'), DMC_PAYMENT_FILTERS),
    invoice: oneOf(params.get('inv'), ['generated', 'none'] as const),
    travelEnded: params.get('flag') === 'ended',
    sort: oneOf(params.get('sort'), SORT_KEYS) ?? d.sort,
    dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
  };
}

/** Inverse of `parseTableQuery`; defaults are omitted to keep URLs short. */
export function tableQueryToParams(q: TableQuery, today: ISODate): URLSearchParams {
  const d = defaultTableQuery(today);
  const p = new URLSearchParams();
  if (q.month !== d.month) p.set('month', q.month);
  if (q.scope === 'all') p.set('scope', 'all');
  if (q.q) p.set('q', q.q);
  if (q.status.length) p.set('status', q.status.join(','));
  if (q.dateField !== d.dateField) p.set('date', q.dateField);
  if (q.from) p.set('from', q.from);
  if (q.to) p.set('to', q.to);
  if (q.clientId) p.set('client', q.clientId);
  if (q.dmcIds.length) p.set('dmc', q.dmcIds.join(','));
  if (q.lineTypes.length) p.set('type', q.lineTypes.join(','));
  if (q.clientPayment) p.set('cpay', q.clientPayment);
  if (q.dmcPayment) p.set('dpay', q.dmcPayment);
  if (q.invoice) p.set('inv', q.invoice);
  if (q.travelEnded) p.set('flag', 'ended');
  if (q.sort !== d.sort) p.set('sort', q.sort);
  if (q.dir !== d.dir) p.set('dir', q.dir);
  return p;
}

/* ---------------- search / filter / sort ---------------- */

/** Case-insensitive substring across Booking ID, Client name/mobile/email, destination, DMC name, confirmation no., invoice no., traveller names. */
export function matchesSearch(row: BookingRow, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  const b = row.booking;
  const haystack = [
    b.bookingNo,
    row.client?.name,
    row.client?.mobile,
    row.client?.email,
    b.destination,
    ...row.dmcs.map((d) => d.name),
    ...b.lines.map((l) => l.confirmationNo),
    b.invoiceNo,
    ...b.travellerNames,
  ];
  return haystack.some((h) => !!h && h.toLowerCase().includes(needle));
}

function dateOf(row: BookingRow, field: DateField): ISODate | undefined {
  return field === 'bookedOn' ? row.bookedOn : row.booking[field];
}

function matchesClientPayment(row: BookingRow, f: ClientPaymentFilter): boolean {
  const out = row.money.clientOutstanding;
  switch (f) {
    case 'paid':
      return out === 0;
    case 'outstanding':
      return out > 0;
    case 'overdue':
      return row.flags.clientOverdue;
    case 'refund':
      return out < 0;
  }
}

function matchesDmcPayment(row: BookingRow, f: DmcPaymentFilter): boolean {
  switch (f) {
    case 'paid':
      return row.money.dmcs.length > 0 && row.money.dmcs.every((d) => d.outstanding <= 0);
    case 'outstanding':
      return row.money.dmcs.some((d) => d.outstanding > 0);
    case 'due7':
      return row.flags.dmcDueSoon;
    case 'overdue':
      return row.flags.dmcOverdue;
  }
}

/** Filter rows by scope, search and advanced filters (no sort). */
export function filterBookingRows(rows: readonly BookingRow[], q: TableQuery): BookingRow[] {
  const ranged = hasDateRange(q);
  return rows.filter((row) => {
    const b = row.booking;
    if (ranged) {
      const date = dateOf(row, q.dateField);
      if (!date || (q.from && date < q.from) || (q.to && date > q.to)) return false;
    } else if (q.scope === 'month' && monthOf(b.travelStart) !== q.month) return false;
    if (q.status.length && !q.status.includes(b.status)) return false;
    if (q.clientId && b.clientId !== q.clientId) return false;
    if (q.dmcIds.length && !b.lines.some((l) => q.dmcIds.includes(l.dmcId))) return false;
    if (q.lineTypes.length && !b.lines.some((l) => q.lineTypes.includes(l.type))) return false;
    if (q.clientPayment && !matchesClientPayment(row, q.clientPayment)) return false;
    if (q.dmcPayment && !matchesDmcPayment(row, q.dmcPayment)) return false;
    if (q.invoice === 'generated' && !b.invoiceNo) return false;
    if (q.invoice === 'none' && b.invoiceNo) return false;
    if (q.travelEnded && !row.flags.travelEnded) return false;
    return matchesSearch(row, q.q);
  });
}

const collator = new Intl.Collator('en-IN', { sensitivity: 'base', numeric: true });

function compare(a: BookingRow, b: BookingRow, key: SortKey): number {
  switch (key) {
    case 'bookingNo':
      return a.booking.bookingSeq - b.booking.bookingSeq;
    case 'client':
      return collator.compare(a.client?.name ?? '', b.client?.name ?? '');
    case 'destination':
      return collator.compare(a.booking.destination, b.booking.destination);
    case 'travelStart':
      return a.booking.travelStart.localeCompare(b.booking.travelStart);
    case 'status':
      return BOOKING_STATUSES.indexOf(a.booking.status) - BOOKING_STATUSES.indexOf(b.booking.status);
    case 'sellingPrice':
      return a.money.sellingPrice - b.money.sellingPrice;
    case 'outstanding':
      return a.money.clientOutstanding - b.money.clientOutstanding;
    case 'commission':
      return a.money.commission - b.money.commission;
    case 'bookedOn':
      return (a.booking.createdAt?.getTime() ?? 0) - (b.booking.createdAt?.getTime() ?? 0);
  }
}

/** Stable sort; ties fall back to Booking ID ascending. */
export function sortBookingRows(rows: readonly BookingRow[], key: SortKey, dir: SortDir): BookingRow[] {
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => sign * compare(a, b, key) || a.booking.bookingSeq - b.booking.bookingSeq);
}

/** Filter then sort. */
export function applyTableQuery(rows: readonly BookingRow[], q: TableQuery): BookingRow[] {
  return sortBookingRows(filterBookingRows(rows, q), q.sort, q.dir);
}

export type TableFooter = {
  /** All filtered rows, including Pending and Cancelled. */
  count: number;
  /** Money under the counting rules (Pending excluded; refunds separate), so a month's footer matches its stat row. */
  sellingPrice: number;
  received: number;
  outstanding: number;
  refundsOwed: number;
  commission: number;
};

export function tableFooter(rows: readonly BookingRow[]): TableFooter {
  const t: Totals = totals(rows.map((r) => ({ ...r.booking, money: r.money })));
  return {
    count: rows.length,
    sellingPrice: t.sellingPrice,
    received: t.received,
    outstanding: t.clientOutstanding,
    refundsOwed: t.clientRefundsOwed,
    commission: t.commission,
  };
}

/** Rows shown in the All time scope before "Show more". */
export const ALL_TIME_PAGE_SIZE = 50;
