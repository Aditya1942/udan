/**
 * Money rules (docs/specs/udan-admin.md, "Money rules"). All amounts are integer INR.
 *
 * Not Cancelled: Selling Price / line Net Cost as stored.
 * Cancelled: Selling Price → `clientCancellationCharge`, each line's Net Cost → its `dmcCancellationCharge`.
 * Outstanding may be negative: Client "Refund ₹X" (owed to the Client) / DMC "Due back ₹X" (owed by the DMC).
 */
import type { Booking, BookingFields, ClientPayment, DmcPayment, INR, PaymentEntry, ServiceLine } from './types';

/** The fields money depends on, so the rail can recompute from unsaved form values. */
export type MoneyInput = Pick<
  BookingFields,
  'status' | 'sellingPrice' | 'lines' | 'clientPayments' | 'dmcPayments' | 'clientCancellationCharge'
>;

export type DmcMoney = {
  dmcId: string;
  /** Σ that DMC's lines' effective cost (Net Cost, or Cancellation Charge while Cancelled). */
  cost: INR;
  paid: INR;
  refunded: INR;
  netPaid: INR;
  /** cost − netPaid; negative = due back from the DMC. */
  outstanding: INR;
};

export type BookingMoney = {
  cancelled: boolean;
  /** Effective Selling Price (Client Cancellation Charge while Cancelled). */
  sellingPrice: INR;
  /** Effective Net Cost (Σ line Cancellation Charges while Cancelled). */
  netCost: INR;
  commission: INR;
  clientPaid: INR;
  clientRefunded: INR;
  clientNetReceived: INR;
  /** Negative = refund owed to the Client. */
  clientOutstanding: INR;
  /** One entry per DMC on a line or a DMC Payment, in first-seen order (lines first). */
  dmcs: DmcMoney[];
  /** Σ per-DMC outstanding (signed). */
  dmcOutstanding: INR;
};

export function isCancelled(b: Pick<BookingFields, 'status'>): boolean {
  return b.status === 'Cancelled';
}

/** A line's cost under the money rules. */
export function lineCost(line: ServiceLine, cancelled: boolean): INR {
  return cancelled ? (line.dmcCancellationCharge ?? 0) : line.netCost;
}

export function sumPayments(entries: readonly PaymentEntry[]): { paid: INR; refunded: INR; net: INR } {
  let paid = 0;
  let refunded = 0;
  for (const e of entries) {
    if (e.kind === 'Refund') refunded += e.amount;
    else paid += e.amount;
  }
  return { paid, refunded, net: paid - refunded };
}

export function bookingMoney(b: MoneyInput): BookingMoney {
  const cancelled = isCancelled(b);
  const sellingPrice = cancelled ? (b.clientCancellationCharge ?? 0) : b.sellingPrice;

  const byDmc = new Map<string, DmcMoney>();
  const dmc = (dmcId: string) => {
    let m = byDmc.get(dmcId);
    if (!m) byDmc.set(dmcId, (m = { dmcId, cost: 0, paid: 0, refunded: 0, netPaid: 0, outstanding: 0 }));
    return m;
  };
  let netCost = 0;
  for (const line of b.lines) {
    const cost = lineCost(line, cancelled);
    netCost += cost;
    if (line.dmcId) dmc(line.dmcId).cost += cost;
  }
  for (const p of b.dmcPayments) {
    const m = dmc(p.dmcId);
    if (p.kind === 'Refund') m.refunded += p.amount;
    else m.paid += p.amount;
  }
  let dmcOutstanding = 0;
  for (const m of byDmc.values()) {
    m.netPaid = m.paid - m.refunded;
    m.outstanding = m.cost - m.netPaid;
    dmcOutstanding += m.outstanding;
  }

  const client = sumPayments(b.clientPayments);
  return {
    cancelled,
    sellingPrice,
    netCost,
    commission: sellingPrice - netCost,
    clientPaid: client.paid,
    clientRefunded: client.refunded,
    clientNetReceived: client.net,
    clientOutstanding: sellingPrice - client.net,
    dmcs: [...byDmc.values()],
    dmcOutstanding,
  };
}

/** Outstanding for one DMC on a Booking (0 when the DMC isn't involved). */
export function dmcOutstandingFor(money: BookingMoney, dmcId: string): INR {
  return money.dmcs.find((d) => d.dmcId === dmcId)?.outstanding ?? 0;
}

/** Lines that still lack a confirmation number (Voucher Received warning). */
export function linesMissingConfirmation(b: Pick<Booking, 'lines'>): ServiceLine[] {
  return b.lines.filter((l) => !l.confirmationNo?.trim());
}

/** Unique DMC ids on a Booking's lines, in line order (DMC Payment targets). In-house lines have none. */
export function lineDmcIds(b: Pick<Booking, 'lines'>): string[] {
  return [...new Set(b.lines.flatMap((l) => (l.dmcId ? [l.dmcId] : [])))];
}

export type LineMoney = {
  lineId: string;
  /** Absent = in-house. */
  dmcId?: string;
  cost: INR;
  /** Net of refunds, from Client entries tagged to this line. */
  clientReceived: INR;
  /** Net of refunds, from DMC entries tagged to this line. */
  dmcPaid: INR;
  /** cost − dmcPaid; undefined for in-house lines. */
  dmcOwed?: INR;
};

/** Per-line money from tagged payment entries, in line order. Untagged entries belong to no line. */
export function lineMoney(b: MoneyInput): LineMoney[] {
  const cancelled = isCancelled(b);
  const tagged = (entries: readonly PaymentEntry[], lineId: string) => sumPayments(entries.filter((e) => e.lineId === lineId)).net;
  return b.lines.map((line) => {
    const cost = lineCost(line, cancelled);
    const dmcPaid = tagged(b.dmcPayments, line.id);
    return {
      lineId: line.id,
      dmcId: line.dmcId,
      cost,
      clientReceived: tagged(b.clientPayments, line.id),
      dmcPaid,
      dmcOwed: line.dmcId ? cost - dmcPaid : undefined,
    };
  });
}

/**
 * Drops `lineId` from entries whose line was deleted, and from DMC entries whose line now has another DMC.
 * Entries stay on the Booking, just untagged; `untagged` counts them for the UI to mention.
 */
export function untagStalePayments(
  prev: Pick<Booking, 'clientPayments' | 'dmcPayments'>,
  nextLines: readonly ServiceLine[],
): { clientPayments: ClientPayment[]; dmcPayments: DmcPayment[]; untagged: { client: number; dmc: number } } {
  const byId = new Map(nextLines.map((l) => [l.id, l]));
  const untag = <T extends ClientPayment>(entries: readonly T[], stale: (p: T) => boolean) => {
    let count = 0;
    const out = entries.map((p) => {
      if (!p.lineId || !stale(p)) return p;
      count++;
      const { lineId: _lineId, ...rest } = p;
      return rest as T;
    });
    return { out, count };
  };
  const client = untag(prev.clientPayments, (p) => !byId.has(p.lineId!));
  const dmc = untag(prev.dmcPayments, (p) => byId.get(p.lineId!)?.dmcId !== p.dmcId);
  return { clientPayments: client.out, dmcPayments: dmc.out, untagged: { client: client.count, dmc: dmc.count } };
}

const inrFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** `148500` → `₹1,48,500`; negatives → `−₹1,000` (U+2212). */
export function formatINR(amount: INR): string {
  const text = `₹${inrFormat.format(Math.abs(amount))}`;
  return amount < 0 ? `−${text}` : text;
}

/** True when `value` is an integer rupee amount >= `min`. */
export function isRupees(value: unknown, min = 0): value is INR {
  return typeof value === 'number' && Number.isInteger(value) && value >= min;
}
