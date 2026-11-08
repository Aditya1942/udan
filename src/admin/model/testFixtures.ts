/** Test fixtures for model tests (not used by app code). */
import type { Booking, Client, ClientPayment, Dmc, DmcPayment, Enquiry, ServiceLine } from './types';

let n = 0;

export function line(overrides: Partial<ServiceLine> = {}): ServiceLine {
  return { id: `l${++n}`, type: 'Hotel', dmcId: 'd1', description: 'Hotel 3N', netCost: 0, ...overrides };
}

export function pay(amount: number, overrides: Partial<ClientPayment> = {}): ClientPayment {
  return { id: `p${++n}`, kind: 'Payment', date: '2026-11-01', amount, mode: 'UPI', ...overrides };
}

export function refund(amount: number, overrides: Partial<ClientPayment> = {}): ClientPayment {
  return pay(amount, { kind: 'Refund', ...overrides });
}

export function dmcPay(dmcId: string, amount: number, overrides: Partial<DmcPayment> = {}): DmcPayment {
  return { ...pay(amount), dmcId, ...overrides };
}

export function booking(overrides: Partial<Booking> = {}): Booking {
  const seq = overrides.bookingSeq ?? ++n;
  return {
    id: `b${seq}`,
    bookingNo: `UDN-${String(seq).padStart(3, '0')}`,
    bookingSeq: seq,
    clientId: 'c1',
    category: 'Package',
    hasTravel: true,
    status: 'Confirmed',
    destination: 'Dubai',
    travelStart: '2026-11-10',
    travelEnd: '2026-11-15',
    pax: { adults: 2, children: 0, infants: 0 },
    travellerNames: [],
    itinerary: '',
    internalNotes: '',
    sellingPrice: 0,
    lines: [],
    clientPayments: [],
    dmcPayments: [],
    createdAt: new Date('2026-10-01T06:00:00Z'),
    ...overrides,
  };
}

export const clients: Client[] = [
  { id: 'c1', name: 'Asha Patel', mobile: '+919876543210', email: 'asha@example.com', city: 'Ahmedabad' },
  { id: 'c2', name: 'Ravi Mehta', mobile: '+919812345678' },
];

export const dmcs: Dmc[] = [
  { id: 'd1', name: 'Gulf Holidays' },
  { id: 'd2', name: 'Kerala Trails' },
];

export function enquiry(overrides: Partial<Enquiry> = {}): Enquiry {
  return {
    id: `e${++n}`,
    name: 'Neha Shah',
    phone: '+919811111111',
    service: 'visa-services',
    message: 'Need a visa',
    sourcePage: '/contact',
    destination: 'Dubai',
    status: 'new',
    createdAt: new Date('2026-10-20T10:00:00Z'),
    ...overrides,
  };
}
