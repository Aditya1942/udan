/**
 * Sample Booking + Business profile for the PDF view-model tests and the rendered samples
 * (UDN-001, Rahul Patel, Kerala — the prototype's data). Not used by app code.
 */
import type { Booking, BusinessProfile, Client, Dmc } from '../model';

export const SAMPLE_DMCS: Dmc[] = [
  { id: 'd1', name: 'Kerala Trails DMC' },
  { id: 'd2', name: 'Spice Coast Transfers' },
];

export const SAMPLE_CLIENT: Client = {
  id: 'c1',
  name: 'Rahul Patel',
  mobile: '+919825011223',
  email: 'rahul.patel@example.com',
  city: 'Ahmedabad',
};

export const FULL_PROFILE: BusinessProfile = {
  tradingName: 'UDAN Immigration & Tours',
  address: 'UGF-12, Meghdeep Complex, Sandesh Press Road\nOpp. Prakash Higher Secondary School, Vastrapur\nAhmedabad, Gujarat 380054',
  phones: '+91 96872 32015',
  email: 'hello@udantours.in',
  website: 'udantours.in',
  accountName: 'UDAN Immigration & Tours',
  accountNumber: '50200012345678',
  ifsc: 'HDFC0001234',
  bankBranch: 'HDFC Bank, Vastrapur',
  upiId: 'udantours@hdfcbank',
  invoiceTerms: 'Balance payable before the travel start date.\nCancellation charges follow the supplier policies shared at booking.',
  emergencyContacts: '+91 96872 32015 (Dolly, 24×7)\n+91 98989 40112 (Ops desk)',
  voucherNotes:
    'Carry a government photo ID for every traveller; hotels may ask at check-in.\nHotel check-in is 2 pm and check-out is 11 am unless noted.\nShow this voucher (printed or on your phone) at each hotel and to your driver.',
};

/** A Kerala trip: three dated lines, one undated (travel insurance), one missing a confirmation no. */
export function sampleBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    bookingNo: 'UDN-001',
    bookingSeq: 1,
    clientId: 'c1',
    category: 'Package',
    hasTravel: true,
    status: 'Confirmed',
    destination: 'Kerala — Kochi, Munnar, Alleppey',
    travelStart: '2026-12-18',
    travelEnd: '2026-12-24',
    pax: { adults: 2, children: 1, infants: 0 },
    travellerNames: ['Rahul Patel', 'Neha Patel', 'Aarav Patel'],
    itinerary:
      'Day 1: Arrive Kochi, Fort Kochi walk\nDay 2–3: Munnar tea gardens, Eravikulam\nDay 4–5: Thekkady spice tour\nDay 6: Alleppey houseboat\nDay 7: Depart Kochi',
    internalNotes: 'Customer prefers ground-floor rooms.',
    sellingPrice: 148_500,
    clientBalanceDueBy: '2026-12-01',
    lines: [
      { id: 'l1', type: 'Transfer', dmcId: 'd2', description: 'Airport pickup, Kochi → Munnar (Innova)', start: '2026-12-18', netCost: 6_500, confirmationNo: 'SCT-88412' },
      { id: 'l2', type: 'Hotel', dmcId: 'd1', description: 'Tea County Munnar, 3N, Deluxe room, breakfast', start: '2026-12-18', end: '2026-12-21', netCost: 52_000, confirmationNo: 'TCM-55120', voucherNotes: 'Early check-in requested.' },
      { id: 'l3', type: 'Hotel', dmcId: 'd1', description: 'Alleppey premium houseboat, 1N, all meals', start: '2026-12-23', end: '2026-12-24', netCost: 24_000 },
      { id: 'l4', type: 'Sightseeing', dmcId: 'd1', description: 'Thekkady spice plantation tour', start: '2026-12-21', netCost: 3_500, confirmationNo: 'KT-2231' },
      { id: 'l5', type: 'Other', dmcId: 'd2', description: 'Travel insurance, 3 travellers', netCost: 2_400, confirmationNo: 'POL-77310' },
    ],
    clientPayments: [
      { id: 'p1', kind: 'Payment', date: '2026-10-28', amount: 50_000, mode: 'UPI', ref: 'UPI-1122' },
      { id: 'p2', kind: 'Payment', date: '2026-11-15', amount: 40_000, mode: 'Bank transfer' },
    ],
    dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-11-02', amount: 30_000, mode: 'Bank transfer', dmcId: 'd1' }],
    invoiceNo: 'UDAN/2026-27/001',
    invoiceSeq: 1,
    invoiceDate: '2026-11-01',
    ...overrides,
  };
}

/** Same Booking, Cancelled on 5 Dec with a ₹40,000 cancellation charge (₹90,000 paid → refund due). */
export function cancelledSample(overrides: Partial<Booking> = {}): Booking {
  return sampleBooking({
    status: 'Cancelled',
    cancelledAt: '2026-12-05',
    cancelReason: 'Family emergency',
    clientCancellationCharge: 40_000,
    ...overrides,
  });
}
