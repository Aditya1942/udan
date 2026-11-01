/** Client and DMC strips/lists: Bookings count, Billed / Net cost, Outstanding, usage (delete gating). */
import { inBookingCounts, inMoneyTotals } from '../counting';
import { lineCost } from '../money';
import type { Booking, ISODate, ServiceLine } from '../types';
import type { BookingRow } from './rows';

export type ClientSummary = {
  /** Counted Bookings (excl. Pending / Cancelled). */
  bookings: number;
  /** Σ effective Selling Price (Pending excluded). */
  billed: number;
  /** Σ positive Client outstanding (Pending excluded). */
  outstanding: number;
  refundsOwed: number;
  /** Every Booking referencing the Client (delete is blocked while > 0). */
  usedIn: number;
};

export function clientSummary(rows: readonly BookingRow[], clientId: string): ClientSummary {
  const s: ClientSummary = { bookings: 0, billed: 0, outstanding: 0, refundsOwed: 0, usedIn: 0 };
  for (const r of rows) {
    if (r.booking.clientId !== clientId) continue;
    s.usedIn += 1;
    if (!inMoneyTotals(r.booking.status)) continue;
    if (inBookingCounts(r.booking.status)) s.bookings += 1;
    s.billed += r.money.sellingPrice;
    if (r.money.clientOutstanding > 0) s.outstanding += r.money.clientOutstanding;
    else s.refundsOwed -= r.money.clientOutstanding;
  }
  return s;
}

export type DmcBookingRow = {
  row: BookingRow;
  lines: ServiceLine[];
  cost: number;
  paid: number;
  /** Signed: negative = due back. */
  outstanding: number;
  /** Earliest pay-by among this DMC's lines on the Booking. */
  payBy?: ISODate;
};

export type DmcSummary = {
  /** Counted Bookings using the DMC. */
  bookings: number;
  netCost: number;
  /** Signed Σ outstanding ("You owe"; negative = "Due back"), Pending excluded. */
  outstanding: number;
  /** Earliest pay-by on Bookings where this DMC is still owed money. */
  nextPayBy?: ISODate;
  /** Every Booking referencing the DMC on a line or payment (delete is blocked while > 0). */
  usedIn: number;
  rows: DmcBookingRow[];
};

export function usesDmc(b: Pick<Booking, 'lines' | 'dmcPayments'>, dmcId: string): boolean {
  return b.lines.some((l) => l.dmcId === dmcId) || b.dmcPayments.some((p) => p.dmcId === dmcId);
}

export function dmcSummary(rows: readonly BookingRow[], dmcId: string): DmcSummary {
  const s: DmcSummary = { bookings: 0, netCost: 0, outstanding: 0, usedIn: 0, rows: [] };
  for (const r of rows) {
    if (!usesDmc(r.booking, dmcId)) continue;
    s.usedIn += 1;
    const lines = r.booking.lines.filter((l) => l.dmcId === dmcId);
    const m = r.money.dmcs.find((d) => d.dmcId === dmcId);
    const payBy = lines.map((l) => l.dmcPayBy).filter((d): d is ISODate => !!d).sort()[0];
    s.rows.push({
      row: r,
      lines,
      cost: lines.reduce((sum, l) => sum + lineCost(l, r.money.cancelled), 0),
      paid: m?.netPaid ?? 0,
      outstanding: m?.outstanding ?? 0,
      payBy,
    });
    if (!inMoneyTotals(r.booking.status)) continue;
    if (inBookingCounts(r.booking.status)) s.bookings += 1;
    s.netCost += m?.cost ?? 0;
    s.outstanding += m?.outstanding ?? 0;
    if ((m?.outstanding ?? 0) > 0 && payBy && (!s.nextPayBy || payBy < s.nextPayBy)) s.nextPayBy = payBy;
  }
  return s;
}
