/**
 * Insights tab: period presets, KPIs (with previous-period comparison) and chart/table series.
 * Month basis everywhere is the IST month of `travelStart`; counting rules apply.
 */
import { addToTotals, emptyTotals, inBookingCounts, inMoneyTotals, type Totals } from '../counting';
import {
  addDays,
  addFy,
  addMonths,
  daysBetween,
  fyOf,
  fyRange,
  inRange,
  monthEnd,
  monthOf,
  monthStart,
  monthsBetween,
  toISTDate,
} from '../dates';
import { lineCost } from '../money';
import { BOOKING_STATUSES, LINE_TYPES, type BookingStatus, type Enquiry, type ISODate, type ISOMonth, type LineType } from '../types';
import type { BookingRow } from './rows';

export type Period = { from: ISODate; to: ISODate };
export const PERIOD_PRESETS = ['thisMonth', 'lastMonth', 'thisFy', 'lastFy', 'custom'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

/** Period for a preset (default This FY). `custom` needs `custom`. */
export function insightsPeriod(preset: PeriodPreset, today: ISODate, custom?: Period): Period {
  const month = monthOf(today);
  switch (preset) {
    case 'thisMonth':
      return { from: monthStart(month), to: monthEnd(month) };
    case 'lastMonth':
      return { from: monthStart(addMonths(month, -1)), to: monthEnd(addMonths(month, -1)) };
    case 'thisFy':
      return fyRange(fyOf(today));
    case 'lastFy':
      return fyRange(addFy(fyOf(today), -1));
    case 'custom':
      if (!custom) throw new Error('custom period needs a range');
      return custom;
  }
}

/**
 * The previous equal period: previous calendar month for a whole month, previous FY for a whole FY,
 * otherwise the same number of days immediately before.
 */
export function previousPeriod(p: Period): Period {
  const fm = monthOf(p.from);
  if (p.from === monthStart(fm) && p.to === monthEnd(fm)) {
    const prev = addMonths(fm, -1);
    return { from: monthStart(prev), to: monthEnd(prev) };
  }
  const fy = fyOf(p.from);
  const r = fyRange(fy);
  if (p.from === r.from && p.to === r.to) return fyRange(addFy(fy, -1));
  const days = daysBetween(p.from, p.to) + 1;
  return { from: addDays(p.from, -days), to: addDays(p.from, -1) };
}

export type Kpis = {
  bookings: number;
  sellingPrice: number;
  commission: number;
  /** Commission ÷ Selling Price; null when Selling Price is 0. */
  commissionPct: number | null;
  /** Σ Selling Price of counted Bookings ÷ their count (Cancelled excluded); null when none. */
  averageSellingPrice: number | null;
  cancellationRate: number | null;
  pendingPipeline: { count: number; sellingPrice: number };
};

export function rowsInPeriod(rows: readonly BookingRow[], p: Period): BookingRow[] {
  return rows.filter((r) => inRange(r.booking.travelStart, p.from, p.to));
}

function totalsOf(rows: readonly BookingRow[]): Totals {
  const t = emptyTotals();
  for (const r of rows) addToTotals(t, r.booking.status, r.money, r.booking.sellingPrice);
  return t;
}

export function kpis(rows: readonly BookingRow[], p: Period): Kpis {
  const inPeriod = rowsInPeriod(rows, p);
  const t = totalsOf(inPeriod);
  const counted = inPeriod.filter((r) => inBookingCounts(r.booking.status));
  const countedSp = counted.reduce((s, r) => s + r.money.sellingPrice, 0);
  return {
    bookings: t.bookings,
    sellingPrice: t.sellingPrice,
    commission: t.commission,
    commissionPct: t.sellingPrice ? t.commission / t.sellingPrice : null,
    averageSellingPrice: counted.length ? Math.round(countedSp / counted.length) : null,
    cancellationRate: t.cancellationRate,
    pendingPipeline: t.pending,
  };
}

/** Relative change (0.25 = +25 %); null when the previous value is 0 or either is null. */
export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export type Named = { key: string; label: string };
export type MonthPoint = { month: ISOMonth; sellingPrice: number; commission: number };
export type StatusPoint = { status: BookingStatus; count: number };
export type AmountPoint = Named & { amount: number };
export type AgeingBucket = 'notDue' | '0-30' | '31-60' | '61-90' | '90+';
export const AGEING_BUCKETS: readonly { key: AgeingBucket; label: string }[] = [
  { key: 'notDue', label: 'Not due' },
  { key: '0-30', label: '0–30 days' },
  { key: '31-60', label: '31–60 days' },
  { key: '61-90', label: '61–90 days' },
  { key: '90+', label: '90+ days' },
];
export type AgeingPoint = { bucket: AgeingBucket; label: string; amount: number; count: number };
export type PayablesWeek = {
  /** `overdue` for pay-by dates before today, else the week's first day. */
  key: string;
  label: string;
  from?: ISODate;
  to?: ISODate;
  amount: number;
  /** Stack segments by DMC id. */
  byDmc: Record<string, number>;
};
export type EnquiryMonthPoint = { month: ISOMonth; enquiries: number; converted: number; rate: number | null };

export type TopClient = { clientId: string; name: string; bookings: number; sellingPrice: number; commission: number; repeat: boolean };
export type TopDmc = { dmcId: string; name: string; lines: number; netCost: number; paid: number; outstanding: number };
export type DestinationRow = { destination: string; bookings: number; sellingPrice: number; commission: number; commissionPct: number | null };

export type InsightsData = {
  period: Period;
  previous: Period;
  kpis: Kpis;
  previousKpis: Kpis;
  byMonth: MonthPoint[];
  byStatus: StatusPoint[];
  commissionByDestination: AmountPoint[];
  netCostByDmc: AmountPoint[];
  sellingPriceByLineType: AmountPoint[];
  clientAgeing: AgeingPoint[];
  dmcPayables: PayablesWeek[];
  enquiryFunnel: EnquiryMonthPoint[];
  topClients: TopClient[];
  topDmcs: TopDmc[];
  destinations: DestinationRow[];
};

const TOP_N = 10;

function top(map: Map<string, AmountPoint>, n = TOP_N): AmountPoint[] {
  return [...map.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label)).slice(0, n);
}

function bump(map: Map<string, AmountPoint>, key: string, label: string, amount: number) {
  const p = map.get(key);
  if (p) p.amount += amount;
  else map.set(key, { key, label, amount });
}

const destinationKey = (d: string) => d.trim().toLowerCase();

/**
 * Splits an amount across weights with integer rupees (largest remainder). All-zero weights split evenly.
 * Used to attribute a Booking's single Selling Price to its Service Line types.
 */
export function allocate(amount: number, weights: readonly number[]): number[] {
  if (!weights.length) return [];
  const total = weights.reduce((s, w) => s + w, 0);
  const w = total > 0 ? weights : weights.map(() => 1);
  const sum = total > 0 ? total : weights.length;
  const raw = w.map((x) => (amount * x) / sum);
  const out = raw.map(Math.floor);
  let rest = amount - out.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]] += 1;
  return out;
}

function ageingBucket(dueBy: ISODate | undefined, today: ISODate): AgeingBucket {
  if (!dueBy || dueBy >= today) return 'notDue';
  const days = daysBetween(dueBy, today);
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/** Client outstanding ageing by days past `clientBalanceDueBy` (as of today; all non-Pending Bookings). */
export function clientAgeing(rows: readonly BookingRow[], today: ISODate): AgeingPoint[] {
  const out = AGEING_BUCKETS.map((b) => ({ bucket: b.key, label: b.label, amount: 0, count: 0 }));
  for (const r of rows) {
    if (!inMoneyTotals(r.booking.status) || r.money.clientOutstanding <= 0) continue;
    const p = out.find((x) => x.bucket === ageingBucket(r.booking.clientBalanceDueBy, today))!;
    p.amount += r.money.clientOutstanding;
    p.count += 1;
  }
  return out;
}

/**
 * DMC payables: an "Overdue" bucket plus the next 8 weeks (from today) by line `dmcPayBy`.
 * Each DMC's net paid on a Booking is applied to its lines in pay-by order; the unpaid rest of a line is due on its pay-by.
 * Lines without a pay-by date are left out.
 */
export function dmcPayables(rows: readonly BookingRow[], today: ISODate, weeks = 8): PayablesWeek[] {
  const buckets: PayablesWeek[] = [{ key: 'overdue', label: 'Overdue', amount: 0, byDmc: {} }];
  for (let i = 0; i < weeks; i++) {
    const from = addDays(today, 7 * i);
    buckets.push({ key: from, label: `Week ${i + 1}`, from, to: addDays(from, 6), amount: 0, byDmc: {} });
  }
  const horizon = addDays(today, 7 * weeks - 1);
  for (const r of rows) {
    if (!inMoneyTotals(r.booking.status)) continue;
    const cancelled = r.money.cancelled;
    for (const d of r.money.dmcs) {
      let credit = d.netPaid;
      const lines = r.booking.lines
        .filter((l) => l.dmcId === d.dmcId)
        .sort((a, b) => (a.dmcPayBy ?? '9999').localeCompare(b.dmcPayBy ?? '9999'));
      for (const l of lines) {
        const cost = lineCost(l, cancelled);
        const covered = Math.max(0, Math.min(cost, credit));
        credit -= covered;
        const unpaid = cost - covered;
        if (!unpaid || !l.dmcPayBy || l.dmcPayBy > horizon) continue;
        const b = l.dmcPayBy < today ? buckets[0] : buckets[1 + Math.floor(daysBetween(today, l.dmcPayBy) / 7)];
        b.amount += unpaid;
        b.byDmc[d.dmcId] = (b.byDmc[d.dmcId] ?? 0) + unpaid;
      }
    }
  }
  return buckets;
}

/** Enquiries by IST `createdAt` month; converted = that cohort's Enquiries with status `converted`. */
export function enquiryFunnel(enquiries: readonly Enquiry[], months: readonly ISOMonth[]): EnquiryMonthPoint[] {
  const points = new Map(months.map((m) => [m, { month: m, enquiries: 0, converted: 0, rate: null as number | null }]));
  for (const e of enquiries) {
    if (!e.createdAt) continue;
    const p = points.get(monthOf(toISTDate(e.createdAt)));
    if (!p) continue;
    p.enquiries += 1;
    if (e.status === 'converted') p.converted += 1;
  }
  for (const p of points.values()) p.rate = p.enquiries ? p.converted / p.enquiries : null;
  return [...points.values()];
}

export type InsightsInput = {
  rows: readonly BookingRow[];
  enquiries: readonly Enquiry[];
  period: Period;
  today: ISODate;
};

export function insights({ rows, enquiries, period, today }: InsightsInput): InsightsData {
  const previous = previousPeriod(period);
  const inPeriod = rowsInPeriod(rows, period);
  const months = monthsBetween(monthOf(period.from), monthOf(period.to));

  const byMonth = new Map(months.map((m) => [m, { month: m, sellingPrice: 0, commission: 0 }]));
  const byStatus = new Map<BookingStatus, number>(BOOKING_STATUSES.map((s) => [s, 0]));
  const byDestination = new Map<string, AmountPoint>();
  const byDmc = new Map<string, AmountPoint>();
  const byType = new Map<string, AmountPoint>(LINE_TYPES.map((t) => [t, { key: t, label: t, amount: 0 }]));
  const clients = new Map<string, TopClient>();
  const dmcs = new Map<string, TopDmc>();
  const destinations = new Map<string, DestinationRow>();

  for (const r of inPeriod) {
    const { booking: b, money: m } = r;
    byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
    if (!inMoneyTotals(b.status)) continue;
    const counted = inBookingCounts(b.status) ? 1 : 0;

    const mp = byMonth.get(monthOf(b.travelStart));
    if (mp) {
      mp.sellingPrice += m.sellingPrice;
      mp.commission += m.commission;
    }

    const dKey = destinationKey(b.destination);
    bump(byDestination, dKey, b.destination.trim(), m.commission);
    const dest = destinations.get(dKey) ?? { destination: b.destination.trim(), bookings: 0, sellingPrice: 0, commission: 0, commissionPct: null };
    dest.bookings += counted;
    dest.sellingPrice += m.sellingPrice;
    dest.commission += m.commission;
    destinations.set(dKey, dest);

    const dmcName = (id: string) => r.dmcs.find((d) => d.id === id)?.name ?? 'Unknown DMC';
    for (const d of m.dmcs) {
      bump(byDmc, d.dmcId, dmcName(d.dmcId), d.cost);
      const td = dmcs.get(d.dmcId) ?? { dmcId: d.dmcId, name: dmcName(d.dmcId), lines: 0, netCost: 0, paid: 0, outstanding: 0 };
      td.lines += b.lines.filter((l) => l.dmcId === d.dmcId).length;
      td.netCost += d.cost;
      td.paid += d.netPaid;
      td.outstanding += d.outstanding;
      dmcs.set(d.dmcId, td);
    }

    const shares = allocate(m.sellingPrice, b.lines.map((l) => lineCost(l, m.cancelled)));
    b.lines.forEach((l, i) => bump(byType, l.type, l.type as LineType, shares[i]));

    const tc = clients.get(b.clientId) ?? { clientId: b.clientId, name: r.client?.name ?? 'Unknown customer', bookings: 0, sellingPrice: 0, commission: 0, repeat: false };
    tc.bookings += counted;
    tc.sellingPrice += m.sellingPrice;
    tc.commission += m.commission;
    clients.set(b.clientId, tc);
  }

  // Repeat = the Client has 2+ counted Bookings across all time.
  const countedPerClient = new Map<string, number>();
  for (const r of rows)
    if (inBookingCounts(r.booking.status))
      countedPerClient.set(r.booking.clientId, (countedPerClient.get(r.booking.clientId) ?? 0) + 1);
  for (const c of clients.values()) c.repeat = (countedPerClient.get(c.clientId) ?? 0) >= 2;
  for (const d of destinations.values()) d.commissionPct = d.sellingPrice ? d.commission / d.sellingPrice : null;

  return {
    period,
    previous,
    kpis: kpis(rows, period),
    previousKpis: kpis(rows, previous),
    byMonth: [...byMonth.values()],
    byStatus: BOOKING_STATUSES.map((status) => ({ status, count: byStatus.get(status) ?? 0 })),
    commissionByDestination: top(byDestination),
    netCostByDmc: top(byDmc),
    sellingPriceByLineType: [...byType.values()].filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount),
    clientAgeing: clientAgeing(rows, today),
    dmcPayables: dmcPayables(rows, today),
    enquiryFunnel: enquiryFunnel(enquiries, months),
    topClients: [...clients.values()].sort((a, b) => b.sellingPrice - a.sellingPrice || b.bookings - a.bookings).slice(0, TOP_N),
    topDmcs: [...dmcs.values()].sort((a, b) => b.netCost - a.netCost).slice(0, TOP_N),
    destinations: [...destinations.values()].sort((a, b) => b.sellingPrice - a.sellingPrice),
  };
}
