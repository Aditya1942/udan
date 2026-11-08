/**
 * Booking flags, all relative to an IST "today" (`todayIST()`).
 * Money flags ignore Pending Bookings (quotes carry no outstanding under the counting rules).
 */
import { serviceDates } from './category';
import { addDays } from './dates';
import { bookingMoney, dmcOutstandingFor, type BookingMoney } from './money';
import type { Booking, ISODate, INR } from './types';

export const DMC_DUE_DAYS = 7;

export type DmcDue = {
  lineId: string;
  dmcId: string;
  dmcPayBy: ISODate;
  /** `overdue` = pay-by before today; `due` = today … today + 7 days. */
  state: 'overdue' | 'due';
  /** That DMC's outstanding on the Booking. */
  outstanding: INR;
};

export type BookingFlags = {
  /** travelEnd < today and status Confirmed / Voucher Received. */
  travelEnded: boolean;
  /** clientBalanceDueBy < today and Client outstanding > 0. */
  clientOverdue: boolean;
  /** One per line whose pay-by is overdue or within 7 days while its DMC's outstanding > 0. */
  dmcDue: DmcDue[];
  dmcOverdue: boolean;
  dmcDueSoon: boolean;
  /** Client outstanding < 0. */
  clientRefundOwed: boolean;
  /** Some DMC outstanding < 0. */
  dmcDueBack: boolean;
};

type FlagInput = Pick<
  Booking,
  'status' | 'travelStart' | 'travelEnd' | 'clientBalanceDueBy' | 'lines' | 'sellingPrice' | 'clientPayments' | 'dmcPayments' | 'clientCancellationCharge'
>;

export function travelEndedNotCompleted(b: Pick<Booking, 'status' | 'travelStart' | 'travelEnd' | 'lines'>, today: ISODate): boolean {
  // An end entered before the start can't make the trip "ended" early.
  const { start, end: entered } = serviceDates(b);
  const end = entered && start && entered < start ? start : entered;
  return !!end && end < today && (b.status === 'Confirmed' || b.status === 'Voucher Received');
}

export function clientBalanceOverdue(b: FlagInput, today: ISODate, money: BookingMoney = bookingMoney(b)): boolean {
  return b.status !== 'Pending' && !!b.clientBalanceDueBy && b.clientBalanceDueBy < today && money.clientOutstanding > 0;
}

export function dmcPaymentsDue(b: FlagInput, today: ISODate, money: BookingMoney = bookingMoney(b)): DmcDue[] {
  if (b.status === 'Pending') return [];
  const horizon = addDays(today, DMC_DUE_DAYS);
  const out: DmcDue[] = [];
  for (const line of b.lines) {
    if (!line.dmcId || !line.dmcPayBy || line.dmcPayBy > horizon) continue;
    const outstanding = dmcOutstandingFor(money, line.dmcId);
    if (outstanding <= 0) continue;
    out.push({
      lineId: line.id,
      dmcId: line.dmcId,
      dmcPayBy: line.dmcPayBy,
      state: line.dmcPayBy < today ? 'overdue' : 'due',
      outstanding,
    });
  }
  return out;
}

export function bookingFlags(b: FlagInput, today: ISODate, money: BookingMoney = bookingMoney(b)): BookingFlags {
  const dmcDue = dmcPaymentsDue(b, today, money);
  const counted = b.status !== 'Pending';
  return {
    travelEnded: travelEndedNotCompleted(b, today),
    clientOverdue: clientBalanceOverdue(b, today, money),
    dmcDue,
    dmcOverdue: dmcDue.some((d) => d.state === 'overdue'),
    dmcDueSoon: dmcDue.some((d) => d.state === 'due'),
    clientRefundOwed: counted && money.clientOutstanding < 0,
    dmcDueBack: counted && money.dmcs.some((d) => d.outstanding < 0),
  };
}
