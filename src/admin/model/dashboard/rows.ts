/** Booking rows: a Booking joined with its Client and DMCs, plus money and flags (computed once per render). */
import { toISTDate } from '../dates';
import { bookingFlags, type BookingFlags } from '../flags';
import { bookingMoney, type BookingMoney } from '../money';
import type { Booking, Client, Dmc, ISODate } from '../types';

export type BookingRow = {
  booking: Booking;
  /** Undefined if the Client record is missing. */
  client?: Client;
  /** Unique DMCs on the lines (missing records skipped), in line order. */
  dmcs: Dmc[];
  money: BookingMoney;
  flags: BookingFlags;
  /** IST date of `createdAt` ("Booked on"). */
  bookedOn?: ISODate;
};

export function buildBookingRows(
  bookings: readonly Booking[],
  clients: readonly Client[],
  dmcs: readonly Dmc[],
  today: ISODate,
): BookingRow[] {
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const dmcById = new Map(dmcs.map((d) => [d.id, d]));
  return bookings.map((booking) => {
    const money = bookingMoney(booking);
    const lineDmcs = [...new Set(booking.lines.map((l) => l.dmcId))]
      .map((id) => dmcById.get(id))
      .filter((d): d is Dmc => !!d);
    return {
      booking,
      client: clientById.get(booking.clientId),
      dmcs: lineDmcs,
      money,
      flags: bookingFlags(booking, today, money),
      bookedOn: booking.createdAt ? toISTDate(booking.createdAt) : undefined,
    };
  });
}
