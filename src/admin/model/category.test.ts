import { describe, expect, it } from 'vitest';
import { bookingDate, bookingEndDate, categoryForService, divisionOf } from './category';
import { booking, line } from './testFixtures';

describe('category helpers', () => {
  it('derives Division', () => {
    expect(divisionOf('Visa')).toBe('Immigration');
    expect(divisionOf('Passport')).toBe('Immigration');
    for (const c of ['Package', 'Hotel', 'Flight', 'Train', 'Bus'] as const) expect(divisionOf(c)).toBe('Travel');
  });
  it('Booking date falls back travelStart → earliest line start → createdAt (IST)', () => {
    expect(bookingDate(booking({ travelStart: '2026-12-01' }))).toBe('2026-12-01');
    expect(bookingDate(booking({ travelStart: '', lines: [line({ start: '2026-12-09' }), line({ start: '2026-12-03' }), line()] }))).toBe('2026-12-03');
    expect(bookingDate(booking({ travelStart: '', lines: [line()], createdAt: new Date('2026-10-31T20:00:00Z') }))).toBe('2026-11-01');
  });
  it('end date falls back travelEnd → latest line end → none', () => {
    expect(bookingEndDate(booking({ travelEnd: '2026-12-05' }))).toBe('2026-12-05');
    expect(bookingEndDate(booking({ travelEnd: '', lines: [line({ end: '2026-12-04' }), line({ end: '2026-12-08' })] }))).toBe('2026-12-08');
    expect(bookingEndDate(booking({ travelEnd: '', lines: [line()] }))).toBeUndefined();
  });
  it('maps enquiry services to Categories', () => {
    expect(categoryForService('international-domestic-tours')).toBe('Package');
    expect(categoryForService('hotel-booking')).toBe('Hotel');
    expect(categoryForService('flight-train-tickets')).toBe('Flight');
    expect(categoryForService('visa-services')).toBe('Visa');
    expect(categoryForService('visitor-business-visa')).toBe('Visa');
    expect(categoryForService('passport-services')).toBe('Passport');
    expect(categoryForService('currency-exchange')).toBeUndefined();
  });
});
