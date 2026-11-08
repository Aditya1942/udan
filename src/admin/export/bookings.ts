/**
 * Bookings table CSV (dashboard Table → CSV button): the filtered + sorted rows, table columns in order.
 * Money follows the Booking's money rules (Cancelled → Cancellation Charges); signed outstanding (negative = refund owed).
 */
import type { BookingRow, ISODate } from '../model';
import { csvFrom, type CsvColumn } from './csv';

const paxCount = (r: BookingRow) => r.booking.pax.adults + r.booking.pax.children + r.booking.pax.infants;

export const BOOKING_COLUMNS: CsvColumn<BookingRow>[] = [
  { header: 'Booking ID', value: (r) => r.booking.bookingNo },
  { header: 'Category', value: (r) => r.booking.category },
  { header: 'Customer', value: (r) => r.client?.name },
  { header: 'Mobile', value: (r) => r.client?.mobile },
  { header: 'Destination', value: (r) => r.booking.destination },
  { header: 'Travel start', value: (r) => r.booking.travelStart },
  { header: 'Travel end', value: (r) => r.booking.travelEnd },
  { header: 'Not marked Completed', value: (r) => (r.flags.travelEnded ? 'Yes' : '') },
  { header: 'Pax', value: paxCount },
  { header: 'Status', value: (r) => r.booking.status },
  { header: 'Selling price', value: (r) => r.money.sellingPrice },
  { header: 'Received', value: (r) => r.money.clientNetReceived },
  { header: 'Customer outstanding', value: (r) => r.money.clientOutstanding },
  { header: 'Commission', value: (r) => r.money.commission },
  { header: 'Net cost', value: (r) => r.money.netCost },
  { header: 'DMC outstanding', value: (r) => r.money.dmcOutstanding },
  { header: 'DMCs', value: (r) => r.dmcs.map((d) => d.name).join('; ') },
  { header: 'Invoice no.', value: (r) => r.booking.invoiceNo },
  { header: 'Booked on', value: (r) => r.bookedOn },
];

export const bookingsCsv = (rows: readonly BookingRow[]) => csvFrom(BOOKING_COLUMNS, rows);
export const bookingsFilename = (today: ISODate) => `udan-bookings-${today}.csv`;
