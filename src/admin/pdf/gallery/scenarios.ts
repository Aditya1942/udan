/**
 * Data scenarios for the `/templates` gallery and the variant render harness. Every template family must lay out
 * every scenario. All people, numbers and bank details are fictional (the gallery is a public route); the Hotel and
 * Visa scenarios mirror the shape of UDAN's own reference voucher/invoice.
 */
import type { Booking, BusinessProfile, Client, Dmc, ISODate } from '../../model';
import { cancelledSample, FULL_PROFILE, SAMPLE_CLIENT, SAMPLE_DMCS, sampleBooking } from '../sampleData';

export type Scenario = {
  id: string;
  label: string;
  /** What this scenario stresses. */
  note: string;
  booking: Booking;
  client?: Client;
  profile: BusinessProfile;
  dmcs: Dmc[];
  /** Voucher issue / admin "prepared" date. */
  today: ISODate;
};

/** Profile with UDAN's real public contact details; bank/UPI numbers are fictional. */
const UDAN_PROFILE: BusinessProfile = {
  ...FULL_PROFILE,
  tradingName: 'UDAN Immigration & Tours',
  address: 'UGF-12, Meghdeep Shopping Centre\nBodakdev, Ahmedabad, Gujarat 380054',
  phones: '+91 96872 32015',
  email: 'bookingudan@gmail.com',
  website: 'udantours.in',
  accountName: 'Udan Consulting and Immigration',
  accountNumber: '10100000000000',
  ifsc: 'IDFB0040000',
  bankBranch: 'IDFC First Bank, Jodhpur Road, Satellite',
  invoiceTerms:
    'We are an unregistered person and have not crossed the taxable value threshold fixed by GST law.\nBalance payable before the travel start date.\nCancellation charges follow the supplier policies shared at booking.',
};

const MINIMAL_PROFILE: BusinessProfile = { tradingName: 'UDAN Immigration & Tours', phones: '+91 96872 32015' };

const HOTEL_DMCS: Dmc[] = [{ id: 'h1', name: 'Grasslands Resorts (direct)', contactPerson: 'Ms. Meera', phone: '+91 78600 00000' }];
const DUBAI_DMCS: Dmc[] = [
  { id: 'x1', name: 'Desert Rose Tourism LLC', contactPerson: 'Imran', phone: '+971 50 000 0000' },
  { id: 'x2', name: 'SkyFare Consolidators', contactPerson: 'Nikhil', phone: '+91 99000 00000' },
  { id: 'x3', name: 'Arabian Wheels Transfers' },
];

export function buildScenarios({ signature }: { signature?: string } = {}): Scenario[] {
  const sig = signature ? { signature } : {};
  return [
    {
      id: 'package-partial',
      label: 'Package · part-paid',
      note: 'Kerala holiday, 5 lines, 2 DMCs, 2 payments, balance due with UPI QR, one line unconfirmed.',
      booking: sampleBooking({ dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-11-02', amount: 30_000, mode: 'Bank transfer', dmcId: 'd1', lineId: 'l2' }] }),
      client: SAMPLE_CLIENT,
      profile: { ...UDAN_PROFILE, ...sig },
      dmcs: SAMPLE_DMCS,
      today: '2026-11-20',
    },
    {
      id: 'hotel-stay',
      label: 'Hotel · paid in full',
      note: 'Shaped like your Blackbuck hotel voucher: 2 rooms, 4 adults + 1 child, 2 nights, meal plan, hotel contact.',
      booking: sampleBooking({
        id: 'b126',
        bookingNo: 'UDN-126',
        category: 'Hotel',
        destination: 'Velavadar, Bhavnagar',
        travelStart: '2026-11-12',
        travelEnd: '2026-11-14',
        pax: { adults: 4, children: 1, infants: 0 },
        travellerNames: ['Mr. Mahesh Desai', 'Mrs. Komal Desai', 'Mr. Rohan Desai', 'Mrs. Priya Desai', 'Vihaan Desai (4)'],
        itinerary: '',
        internalNotes: 'Booked direct with the resort sales desk. Ask for cottages next to each other.',
        sellingPrice: 32_000,
        clientBalanceDueBy: undefined,
        lines: [
          {
            id: 'l1',
            type: 'Hotel',
            dmcId: 'h1',
            description: 'The Grassland Trails, Velavadar — 2 × Luxury Cottage with sit-out, Breakfast + Hi-tea + Dinner',
            start: '2026-11-12',
            end: '2026-11-14',
            netCost: 26_800,
            confirmationNo: '1496',
            dmcPayBy: '2026-11-05',
            voucherNotes: 'Velavadar–Valpipur Road, Bhavnagar, Gujarat 364313. Hotel contact: +91 78600 00000 (Ms. Meera). Check-in 2 pm, check-out 11 am.',
          },
        ],
        clientPayments: [
          { id: 'p1', kind: 'Payment', date: '2026-10-29', amount: 16_000, mode: 'UPI', ref: 'UPI-55120' },
          { id: 'p2', kind: 'Payment', date: '2026-10-31', amount: 16_000, mode: 'Bank transfer', ref: 'NEFT-99812' },
        ],
        dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-11-01', amount: 26_800, mode: 'Bank transfer', dmcId: 'h1', lineId: 'l1' }],
        invoiceNo: 'UDAN/2026-27/126',
        invoiceSeq: 126,
        invoiceDate: '2026-10-31',
      }),
      client: { id: 'c126', name: 'Mr. Mahesh Desai & Mrs. Komal Desai', mobile: '+919800000126', email: 'mahesh.desai@example.com', city: 'Ahmedabad' },
      profile: { ...UDAN_PROFILE, ...sig },
      dmcs: HOTEL_DMCS,
      today: '2026-10-31',
    },
    {
      id: 'visa-due',
      label: 'Visa · balance due',
      note: 'Shaped like your invoice #402: immigration service, no travel dates, client address + PAN, bank table, GST note.',
      booking: sampleBooking({
        id: 'b402',
        bookingNo: 'UDN-402',
        category: 'Visa',
        hasTravel: false,
        destination: '',
        travelStart: '',
        travelEnd: '',
        pax: { adults: 1, children: 0, infants: 0 },
        travellerNames: ['Mr. Jayesh Parikh'],
        itinerary: '',
        internalNotes: 'Property valuation through our CA partner (₹4,000 pass-through). Biometrics slot pending.',
        sellingPrice: 18_000,
        clientBalanceDueBy: '2026-09-20',
        lines: [
          {
            id: 'l1',
            type: 'Visa',
            description: 'Visa consulting and file preparation, incl. property valuation report',
            netCost: 4_000,
            visaType: 'Visitor',
            visaCountry: 'Canada',
            dmcId: 'v1',
          },
        ],
        clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-09-07', amount: 10_000, mode: 'Cash' }],
        dmcPayments: [],
        invoiceNo: 'UDAN/2026-27/402',
        invoiceSeq: 402,
        invoiceDate: '2026-09-07',
      }),
      client: {
        id: 'c402',
        name: 'Jayesh Parikh',
        mobile: '+919800000402',
        address: '302, Sample Park Apartment, Udhna',
        city: 'Surat',
        state: 'Gujarat',
        country: 'India',
        pan: 'ABCDE1234F',
      },
      profile: { ...UDAN_PROFILE, ...sig },
      dmcs: [{ id: 'v1', name: 'Shah & Co. Valuers (CA partner)' }],
      today: '2026-09-07',
    },
    {
      id: 'cancelled-refund',
      label: 'Cancelled · refund due',
      note: 'Cancelled Kerala package: ₹40,000 charge, ₹90,000 received → refund due; DMC cancellation charges. No voucher.',
      booking: cancelledSample({
        lines: sampleBooking().lines.map((l, i) => ({ ...l, dmcCancellationCharge: [2_000, 15_000, 8_000, 0, 2_400][i] })),
      }),
      client: SAMPLE_CLIENT,
      profile: { ...UDAN_PROFILE, ...sig },
      dmcs: SAMPLE_DMCS,
      today: '2026-12-06',
    },
    {
      id: 'flight-minimal',
      label: 'Flight · minimal data',
      note: 'One flight line, paid in full, client has only name + mobile, profile has only name + phone (no bank, terms, signature).',
      booking: sampleBooking({
        id: 'b77',
        bookingNo: 'UDN-077',
        category: 'Flight',
        destination: 'Ahmedabad → Goa',
        travelStart: '2026-12-02',
        travelEnd: '',
        pax: { adults: 1, children: 0, infants: 0 },
        travellerNames: [],
        itinerary: '',
        internalNotes: '',
        sellingPrice: 6_450,
        clientBalanceDueBy: undefined,
        lines: [{ id: 'l1', type: 'Flight', description: 'IndiGo 6E-512 AMD 07:10 → GOI 08:55, 15 kg', start: '2026-12-02', netCost: 5_980, confirmationNo: 'PNR K7QW2Z' }],
        clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-11-18', amount: 6_450, mode: 'UPI' }],
        dmcPayments: [],
        invoiceNo: 'UDAN/2026-27/077',
        invoiceSeq: 77,
        invoiceDate: '2026-11-18',
      }),
      client: { id: 'c77', name: 'Asha Mehta', mobile: '+919800000077' },
      profile: MINIMAL_PROFILE,
      dmcs: [],
      today: '2026-11-18',
    },
    {
      id: 'intl-large',
      label: 'International · long',
      note: 'Dubai + Abu Dhabi, 6 travellers, 9 lines over 3 DMCs, refund entry, 3 unconfirmed, long itinerary → multi-page.',
      booking: sampleBooking({
        id: 'b210',
        bookingNo: 'UDN-210',
        category: 'Package',
        tripScope: 'International',
        destination: 'Dubai & Abu Dhabi — 6 nights family holiday with Desert Safari, Ferrari World and Dhow Cruise',
        travelStart: '2027-01-08',
        travelEnd: '2027-01-14',
        pax: { adults: 4, children: 1, infants: 1 },
        travellerNames: [
          'Mr. Venkataraghavan Subramaniam Iyer',
          'Mrs. Lakshmi Venkataraghavan',
          'Mr. Arvind Krishnamurthy',
          'Mrs. Deepa Arvind',
          'Master Advik Arvind (7)',
          'Baby Ira Arvind (1)',
        ],
        itinerary: [
          'Day 1 (8 Jan): Arrive Dubai DXB, private transfer to hotel. Evening Dhow Cruise at Dubai Marina with dinner.',
          'Day 2 (9 Jan): Half-day Dubai city tour — Jumeirah Mosque, Dubai Frame, Gold Souk. Evening free.',
          'Day 3 (10 Jan): Burj Khalifa At The Top (124th floor, 4:30 pm slot). Dubai Mall and fountain show.',
          'Day 4 (11 Jan): Desert Safari with dune bashing, camel ride, BBQ dinner, Tanoura show.',
          'Day 5 (12 Jan): Transfer to Abu Dhabi. Sheikh Zayed Grand Mosque on the way. Check in Yas Island.',
          'Day 6 (13 Jan): Ferrari World full day (children under 3 free). Optional Yas Waterworld.',
          'Day 7 (14 Jan): Check out, transfer to AUH airport for the flight home.',
          '',
          'Dress code at the Grand Mosque: full sleeves and ankle-length clothing; women must cover their hair.',
        ].join('\n'),
        internalNotes:
          'Flights on group fare via SkyFare; name change not allowed.\nDesert Rose quote valid till 30 Nov — pay balance before then.\nClient asked for vegetarian meals throughout.',
        sellingPrice: 6_84_500,
        clientBalanceDueBy: '2026-12-20',
        lines: [
          { id: 'l1', type: 'Flight', dmcId: 'x2', description: 'Emirates EK-539 AMD → DXB 04:25, 6 pax, 30 kg each', start: '2027-01-08', netCost: 1_92_000, confirmationNo: 'PNR EK7H2K', dmcPayBy: '2026-11-25' },
          { id: 'l2', type: 'Transfer', dmcId: 'x3', description: 'DXB airport → hotel, private 7-seater + child seat', start: '2027-01-08', netCost: 9_500 },
          { id: 'l3', type: 'Hotel', dmcId: 'x1', description: 'Rove Downtown Dubai — 2 connecting rooms, breakfast', start: '2027-01-08', end: '2027-01-12', netCost: 1_48_000, confirmationNo: 'RV-449812', voucherNotes: 'Connecting rooms requested; baby cot confirmed.' },
          { id: 'l4', type: 'Sightseeing', dmcId: 'x1', description: 'Dhow Cruise Marina with dinner (veg)', start: '2027-01-08', netCost: 18_000, confirmationNo: 'DR-DC-1182' },
          { id: 'l5', type: 'Sightseeing', dmcId: 'x1', description: 'Burj Khalifa At The Top, 124th floor, 4:30 pm', start: '2027-01-10', netCost: 32_000 },
          { id: 'l6', type: 'Sightseeing', dmcId: 'x1', description: 'Desert Safari with BBQ dinner, shared 4×4', start: '2027-01-11', netCost: 21_000, confirmationNo: 'DR-DS-2231' },
          { id: 'l7', type: 'Hotel', dmcId: 'x1', description: 'Yas Island Rotana Abu Dhabi — 2 rooms, half board', start: '2027-01-12', end: '2027-01-14', netCost: 74_000 },
          { id: 'l8', type: 'Flight', dmcId: 'x2', description: 'Emirates EK-538 AUH(via DXB) → AMD 21:45, 6 pax', start: '2027-01-14', netCost: 0, confirmationNo: 'PNR EK7H2K' },
          { id: 'l9', type: 'Visa', dmcId: 'x1', description: 'UAE 30-day tourist visa × 6 incl. insurance', netCost: 42_000, confirmationNo: 'Applied — ref DR-V-551', visaType: 'Visitor', visaCountry: 'UAE' },
        ],
        clientPayments: [
          { id: 'p1', kind: 'Payment', date: '2026-10-05', amount: 2_00_000, mode: 'Bank transfer', ref: 'NEFT-771201' },
          { id: 'p2', kind: 'Payment', date: '2026-11-02', amount: 2_50_000, mode: 'Cheque', ref: 'CHQ 004512' },
          { id: 'p3', kind: 'Refund', date: '2026-11-10', amount: 12_000, mode: 'UPI', note: 'Dropped Global Village' },
        ],
        dmcPayments: [
          { id: 'q1', kind: 'Payment', date: '2026-10-06', amount: 1_92_000, mode: 'Bank transfer', dmcId: 'x2', lineId: 'l1' },
          { id: 'q2', kind: 'Payment', date: '2026-11-03', amount: 1_50_000, mode: 'Bank transfer', dmcId: 'x1' },
        ],
        invoiceNo: 'UDAN/2026-27/210',
        invoiceSeq: 210,
        invoiceDate: '2026-10-05',
      }),
      client: {
        id: 'c210',
        name: 'Mr. Venkataraghavan Subramaniam Iyer',
        mobile: '+919800000210',
        email: 'venkat.iyer.family.travel@example-mail.co.in',
        whatsapp: '+919800000211',
        address: 'B-1102, Shilp Residency, Near Shivranjani Cross Roads, Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
        gstin: '24ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
      },
      profile: { ...UDAN_PROFILE, ...sig },
      dmcs: DUBAI_DMCS,
      today: '2026-11-20',
    },
  ];
}
