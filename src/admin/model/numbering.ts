/** Booking ID and Invoice number formatting (spec: "Booking ID and invoice numbering"). */
import { fyOf } from './dates';
import type { FY, ISODate } from './types';

export const BOOKING_COUNTER_ID = 'booking';

const pad3 = (n: number) => String(n).padStart(3, '0');

/** 1 → `UDN-001`, 1000 → `UDN-1000`. */
export function formatBookingNo(seq: number): string {
  return `UDN-${pad3(seq)}`;
}

/** `UDN-007` → 7; null when not a Booking ID. */
export function parseBookingNo(bookingNo: string): number | null {
  const m = /^UDN-(\d{3,})$/.exec(bookingNo.trim().toUpperCase());
  return m ? Number(m[1]) : null;
}

/** (`2026-27`, 1) → `UDAN/2026-27/001`. */
export function formatInvoiceNo(fy: FY, seq: number): string {
  return `UDAN/${fy}/${pad3(seq)}`;
}

/** Counter doc id for an FY: `invoice-2026-27`. */
export function invoiceCounterId(fy: FY): string {
  return `invoice-${fy}`;
}

/** FY and counter id for an invoice dated `invoiceDate` (IST). */
export function invoiceSeries(invoiceDate: ISODate): { fy: FY; counterId: string } {
  const fy = fyOf(invoiceDate);
  return { fy, counterId: invoiceCounterId(fy) };
}
