/** Booking Category helpers: Division, single-service rule, Booking/end dates, enquiry-service mapping. */
import { toISTDate } from './dates';
import type { Booking, BookingCategory, Division, ISODate } from './types';

/** Visa and Passport are Immigration; everything else is Travel. */
export function divisionOf(category: BookingCategory): Division {
  return category === 'Visa' || category === 'Passport' ? 'Immigration' : 'Travel';
}

/** Every Category except Package holds exactly one Service line. */
export function isSingleService(category: BookingCategory): boolean {
  return category !== 'Package';
}

/** Dates the Admin actually entered (travel, else line dates) — never the createdAt fallback. For display. */
export function serviceDates(b: Pick<Booking, 'travelStart' | 'travelEnd' | 'lines'>): { start?: ISODate; end?: ISODate } {
  const starts = b.lines.map((l) => l.start).filter((d): d is ISODate => !!d);
  const start = b.travelStart || (starts.length ? starts.reduce((a, d) => (d < a ? d : a)) : undefined);
  return { start, end: bookingEndDate(b) };
}

/** travelStart, else earliest line start, else the IST date of createdAt (undefined only without createdAt). */
export function bookingDate(b: Pick<Booking, 'travelStart' | 'lines' | 'createdAt'>): ISODate | undefined {
  return serviceDates({ ...b, travelEnd: '' }).start ?? (b.createdAt ? toISTDate(b.createdAt) : undefined);
}

/** travelEnd, else latest line end, else none. */
export function bookingEndDate(b: Pick<Booking, 'travelEnd' | 'lines'>): ISODate | undefined {
  if (b.travelEnd) return b.travelEnd;
  const ends = b.lines.map((l) => l.end).filter((d): d is ISODate => !!d);
  return ends.length ? ends.reduce((a, d) => (d > a ? d : a)) : undefined;
}

const SERVICE_CATEGORY: Readonly<Record<string, BookingCategory>> = {
  'international-domestic-tours': 'Package',
  'hotel-booking': 'Hotel',
  'flight-train-tickets': 'Flight',
  'visa-services': 'Visa',
  'visitor-business-visa': 'Visa',
  'passport-services': 'Passport',
};

/** Category preset for a converted enquiry's service; undefined = none. */
export function categoryForService(serviceId: string): BookingCategory | undefined {
  return Object.hasOwn(SERVICE_CATEGORY, serviceId) ? SERVICE_CATEGORY[serviceId] : undefined;
}
