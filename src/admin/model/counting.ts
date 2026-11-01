/**
 * Counting rules (dashboard, Insights, Client/DMC strips):
 * - Pending: excluded from money totals and counts (Insights shows it as "Pending pipeline").
 * - Confirmed / Voucher Received / Completed: included.
 * - Cancelled: Cancellation Charges as Selling Price / Net Cost; excluded from counts (feeds Cancellation rate);
 *   negative outstanding is listed separately as refunds, never netted into totals.
 * Negative outstanding on a non-cancelled Booking (overpaid Client, deleted line with DMC Payments) is
 * treated the same way, so a refund is never hidden inside a total.
 */
import { bookingMoney, type BookingMoney, type MoneyInput } from './money';
import type { BookingStatus, INR } from './types';

export type CountingClass = 'pending' | 'counted' | 'cancelled';

export function countingClass(status: BookingStatus): CountingClass {
  if (status === 'Pending') return 'pending';
  if (status === 'Cancelled') return 'cancelled';
  return 'counted';
}

/** Included in money totals (everything but Pending). */
export function inMoneyTotals(status: BookingStatus): boolean {
  return status !== 'Pending';
}

/** Included in Booking counts (Confirmed / Voucher Received / Completed). */
export function inBookingCounts(status: BookingStatus): boolean {
  return countingClass(status) === 'counted';
}

export type Totals = {
  /** Count of Confirmed / Voucher Received / Completed. */
  bookings: number;
  sellingPrice: INR;
  netCost: INR;
  commission: INR;
  /** Σ Client net received. */
  received: INR;
  /** Σ positive Client outstanding. */
  clientOutstanding: INR;
  /** Σ |negative Client outstanding| — refunds owed to Clients. */
  clientRefundsOwed: INR;
  /** Σ positive per-DMC outstanding — what UDAN owes DMCs. */
  dmcOutstanding: INR;
  /** Σ |negative per-DMC outstanding| — due back from DMCs. */
  dmcDueBack: INR;
  cancelled: number;
  /** cancelled ÷ (counted + cancelled); null when both are 0. */
  cancellationRate: number | null;
  pending: { count: number; sellingPrice: INR };
};

export function emptyTotals(): Totals {
  return {
    bookings: 0,
    sellingPrice: 0,
    netCost: 0,
    commission: 0,
    received: 0,
    clientOutstanding: 0,
    clientRefundsOwed: 0,
    dmcOutstanding: 0,
    dmcDueBack: 0,
    cancelled: 0,
    cancellationRate: null,
    pending: { count: 0, sellingPrice: 0 },
  };
}

/** Add one Booking to running totals under the counting rules (mutates `t`). */
export function addToTotals(t: Totals, status: BookingStatus, m: BookingMoney, rawSellingPrice: INR): void {
  const cls = countingClass(status);
  if (cls === 'pending') {
    t.pending.count += 1;
    t.pending.sellingPrice += rawSellingPrice;
    return;
  }
  if (cls === 'counted') t.bookings += 1;
  else t.cancelled += 1;
  t.sellingPrice += m.sellingPrice;
  t.netCost += m.netCost;
  t.commission += m.commission;
  t.received += m.clientNetReceived;
  if (m.clientOutstanding >= 0) t.clientOutstanding += m.clientOutstanding;
  else t.clientRefundsOwed -= m.clientOutstanding;
  for (const d of m.dmcs) {
    if (d.outstanding >= 0) t.dmcOutstanding += d.outstanding;
    else t.dmcDueBack -= d.outstanding;
  }
  const decided = t.bookings + t.cancelled;
  t.cancellationRate = decided ? t.cancelled / decided : null;
}

/** Totals for a set of Bookings under the counting rules. */
export function totals(bookings: Iterable<MoneyInput & { money?: BookingMoney }>): Totals {
  const t = emptyTotals();
  for (const b of bookings) addToTotals(t, b.status, b.money ?? bookingMoney(b), b.sellingPrice);
  return t;
}
