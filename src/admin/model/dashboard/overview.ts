/** Overview: month stat row and Needs attention. */
import { totals } from '../counting';
import { daysBetween, formatDate, monthOf } from '../dates';
import { formatINR } from '../money';
import type { Enquiry, ISODate, ISOMonth } from '../types';
import type { BookingRow } from './rows';
import type { TableQuery } from './table';

export type MonthStats = {
  /** Count excl. Pending / Cancelled. */
  bookings: number;
  sellingPrice: number;
  commission: number;
  /** Positive Client outstanding of the month's Bookings. */
  clientOutstanding: number;
};

/** Stat row for Bookings whose travelStart falls in `month`. */
export function monthStats(rows: readonly BookingRow[], month: ISOMonth): MonthStats {
  const t = totals(
    rows.filter((r) => monthOf(r.booking.travelStart) === month).map((r) => ({ ...r.booking, money: r.money })),
  );
  return { bookings: t.bookings, sellingPrice: t.sellingPrice, commission: t.commission, clientOutstanding: t.clientOutstanding };
}

export type AttentionKey = 'clientOverdue' | 'dmcDue' | 'refunds' | 'travelEnded' | 'newEnquiries' | 'backupOverdue';
export type AttentionTone = 'danger' | 'warn' | 'info';

export type AttentionItem = {
  bookingId: string;
  bookingNo: string;
  clientName: string;
  detail: string;
};

export type AttentionCategory = {
  key: AttentionKey;
  tone: AttentionTone;
  label: string;
  count: number;
  /** Booking items (empty for New Enquiries / Backup overdue). */
  items: AttentionItem[];
  /** Pre-filtered table links (merge into the default query, scope All time). */
  links: { label: string; query: Partial<TableQuery> }[];
  /** For backupOverdue: the last backup date, or null if never. */
  lastBackup?: ISODate | null;
};

export const BACKUP_MAX_AGE_DAYS = 30;

export function isBackupOverdue(lastBackup: ISODate | null | undefined, today: ISODate): boolean {
  return !lastBackup || daysBetween(lastBackup, today) > BACKUP_MAX_AGE_DAYS;
}

export type AttentionInput = {
  rows: readonly BookingRow[];
  enquiries: readonly Enquiry[];
  /** IST date of the last Backup on this device (localStorage), or null. */
  lastBackup: ISODate | null;
  today: ISODate;
};

/** Needs attention (all-time); only non-empty categories, in display order. */
export function needsAttention({ rows, enquiries, lastBackup, today }: AttentionInput): AttentionCategory[] {
  const item = (r: BookingRow, detail: string): AttentionItem => ({
    bookingId: r.booking.id,
    bookingNo: r.booking.bookingNo,
    clientName: r.client?.name ?? 'Unknown client',
    detail,
  });
  const dmcName = (r: BookingRow, id: string) => r.dmcs.find((d) => d.id === id)?.name ?? 'Unknown DMC';
  const bySeq = [...rows].sort((a, b) => a.booking.bookingSeq - b.booking.bookingSeq);

  const clientOverdue: AttentionItem[] = [];
  const dmcDue: AttentionItem[] = [];
  const refunds: AttentionItem[] = [];
  const travelEnded: AttentionItem[] = [];
  let anyDueSoon = false;
  let anyDmcOverdue = false;
  let anyClientRefund = false;

  for (const r of bySeq) {
    const { flags, money, booking } = r;
    if (flags.clientOverdue)
      clientOverdue.push(item(r, `${formatINR(money.clientOutstanding)} overdue since ${formatDate(booking.clientBalanceDueBy!)}`));
    // One item per DMC on the Booking, at its earliest pay-by.
    const seen = new Set<string>();
    for (const d of [...flags.dmcDue].sort((a, b) => a.dmcPayBy.localeCompare(b.dmcPayBy))) {
      if (seen.has(d.dmcId)) continue;
      seen.add(d.dmcId);
      const when = d.state === 'overdue' ? `overdue since ${formatDate(d.dmcPayBy)}` : `due ${formatDate(d.dmcPayBy)}`;
      dmcDue.push(item(r, `${dmcName(r, d.dmcId)} ${formatINR(d.outstanding)} ${when}`));
    }
    anyDueSoon ||= flags.dmcDueSoon;
    anyDmcOverdue ||= flags.dmcOverdue;
    if (flags.clientRefundOwed) {
      anyClientRefund = true;
      refunds.push(item(r, `Refund ${formatINR(-money.clientOutstanding)} to Client`));
    }
    if (flags.dmcDueBack)
      for (const d of money.dmcs)
        if (d.outstanding < 0) refunds.push(item(r, `${dmcName(r, d.dmcId)} due back ${formatINR(-d.outstanding)}`));
    if (flags.travelEnded) travelEnded.push(item(r, `Travel ended ${formatDate(booking.travelEnd)}`));
  }

  const out: AttentionCategory[] = [];
  const push = (c: Omit<AttentionCategory, 'count'> & { count?: number }) => {
    const count = c.count ?? c.items.length;
    if (count > 0) out.push({ ...c, count });
  };
  push({
    key: 'clientOverdue',
    tone: 'danger',
    label: 'Client balance overdue',
    items: clientOverdue,
    links: [{ label: 'Show in table', query: { scope: 'all', clientPayment: 'overdue' } }],
  });
  push({
    key: 'dmcDue',
    tone: 'warn',
    label: 'DMC payments due in 7 days / overdue',
    items: dmcDue,
    links: [
      ...(anyDmcOverdue ? [{ label: 'Overdue', query: { scope: 'all', dmcPayment: 'overdue' } as Partial<TableQuery> }] : []),
      ...(anyDueSoon ? [{ label: 'Due in 7 days', query: { scope: 'all', dmcPayment: 'due7' } as Partial<TableQuery> }] : []),
    ],
  });
  push({
    key: 'refunds',
    tone: 'warn',
    label: 'Refunds owed to Clients / due from DMCs',
    items: refunds,
    links: anyClientRefund ? [{ label: 'Refunds owed to Clients', query: { scope: 'all', clientPayment: 'refund' } }] : [],
  });
  push({
    key: 'travelEnded',
    tone: 'info',
    label: 'Travel ended, not marked Completed',
    items: travelEnded,
    links: [{ label: 'Show in table', query: { scope: 'all', travelEnded: true } }],
  });
  push({
    key: 'newEnquiries',
    tone: 'info',
    label: 'New Enquiries',
    items: [],
    links: [],
    count: enquiries.filter((e) => e.status === 'new').length,
  });
  if (isBackupOverdue(lastBackup, today))
    out.push({ key: 'backupOverdue', tone: 'warn', label: 'Backup overdue', count: 1, items: [], links: [], lastBackup });
  return out;
}
