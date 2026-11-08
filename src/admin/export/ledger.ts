/**
 * Payments Ledger: every Client Payment, DMC Payment and Refund across all Bookings (incl. Cancelled),
 * by payment date. Signed amount = money into UDAN +, out −.
 */
import { insightsPeriod, type Booking, type BookingStatus, type Client, type Dmc, type ISODate, type PayMode, type Period } from '../model';
import { csvFrom, type CsvColumn } from './csv';

export const LEDGER_SIDES = ['both', 'client', 'dmc'] as const;
export type LedgerSide = (typeof LEDGER_SIDES)[number];

export const LEDGER_PRESETS = ['thisFy', 'lastFy', 'thisMonth', 'custom'] as const;
export type LedgerPreset = (typeof LEDGER_PRESETS)[number];

/** Date range for a preset (default This FY), IST. */
export function ledgerPeriod(preset: LedgerPreset, today: ISODate, custom?: Period): Period {
  return insightsPeriod(preset, today, custom);
}

export type LedgerRow = {
  date: ISODate;
  bookingNo: string;
  bookingSeq: number;
  bookingStatus: BookingStatus;
  side: 'Customer' | 'DMC';
  /** Client or DMC name ('' if the record is missing). */
  party: string;
  kind: 'Payment' | 'Refund';
  mode: PayMode;
  ref: string;
  note: string;
  /** Always positive. */
  amount: number;
  /** Client payment +, Client refund −, DMC payment −, DMC refund +. */
  signedAmount: number;
};

export type LedgerFilter = Period & { side: LedgerSide };

export function signedAmount(side: 'Customer' | 'DMC', kind: 'Payment' | 'Refund', amount: number): number {
  const into = side === 'Customer' ? kind === 'Payment' : kind === 'Refund';
  return into ? amount : -amount;
}

/** Ledger rows within the date range (inclusive) and side, sorted by date asc, then Booking ID. */
export function ledgerRows(
  bookings: readonly Booking[],
  clientsById: ReadonlyMap<string, Client>,
  dmcsById: ReadonlyMap<string, Dmc>,
  { from, to, side }: LedgerFilter,
): LedgerRow[] {
  const out: LedgerRow[] = [];
  const base = (b: Booking) => ({ bookingNo: b.bookingNo, bookingSeq: b.bookingSeq, bookingStatus: b.status });
  const inRange = (date: ISODate) => date >= from && date <= to;
  for (const b of bookings) {
    if (side !== 'dmc') {
      for (const p of b.clientPayments) {
        if (!inRange(p.date)) continue;
        out.push({
          ...base(b),
          date: p.date,
          side: 'Customer',
          party: clientsById.get(b.clientId)?.name ?? '',
          kind: p.kind,
          mode: p.mode,
          ref: p.ref ?? '',
          note: p.note ?? '',
          amount: p.amount,
          signedAmount: signedAmount('Customer', p.kind, p.amount),
        });
      }
    }
    if (side !== 'client') {
      for (const p of b.dmcPayments) {
        if (!inRange(p.date)) continue;
        out.push({
          ...base(b),
          date: p.date,
          side: 'DMC',
          party: dmcsById.get(p.dmcId)?.name ?? '',
          kind: p.kind,
          mode: p.mode,
          ref: p.ref ?? '',
          note: p.note ?? '',
          amount: p.amount,
          signedAmount: signedAmount('DMC', p.kind, p.amount),
        });
      }
    }
  }
  // Stable sort keeps entry order within one Booking and date.
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.bookingSeq - b.bookingSeq));
}

export const LEDGER_COLUMNS: CsvColumn<LedgerRow>[] = [
  { header: 'Date', value: (r) => r.date },
  { header: 'Booking ID', value: (r) => r.bookingNo },
  { header: 'Booking status', value: (r) => r.bookingStatus },
  { header: 'Side', value: (r) => r.side },
  { header: 'Party', value: (r) => r.party },
  { header: 'Kind', value: (r) => r.kind },
  { header: 'Mode', value: (r) => r.mode },
  { header: 'Reference', value: (r) => r.ref },
  { header: 'Note', value: (r) => r.note },
  { header: 'Amount', value: (r) => r.amount },
  { header: 'Signed amount', value: (r) => r.signedAmount },
];

export const ledgerCsv = (rows: readonly LedgerRow[]) => csvFrom(LEDGER_COLUMNS, rows);

export const ledgerFilename = ({ from, to }: Period) => `udan-payments-${from}-${to}.csv`;
