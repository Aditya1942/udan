/** Counting rules, flags, IST dates/FY, numbering and document naming. */
import { describe, expect, it } from 'vitest';
import { totals } from './counting';
import { addMonths, fyOf, fyRange, formatDate, monthEnd, todayIST, toISTDate } from './dates';
import { emailSubject, invoiceFilename, shareMessage, voucherFilename, whatsappUrl } from './documents';
import { bookingFlags, travelEndedNotCompleted } from './flags';
import { formatBookingNo, formatInvoiceNo, invoiceSeries, parseBookingNo } from './numbering';
import { booking, dmcPay, line, pay } from './testFixtures';
import type { BookingEditableFields } from './types';
import { validateBookingFields, validateLine, validatePayment } from './validate';

describe('counting rules', () => {
  const t = totals([
    booking({ status: 'Pending', sellingPrice: 50_000 }),
    booking({ status: 'Confirmed', sellingPrice: 100_000, lines: [line({ netCost: 80_000 })], clientPayments: [pay(40_000)] }),
    booking({ status: 'Completed', sellingPrice: 20_000, lines: [line({ netCost: 15_000 })], clientPayments: [pay(20_000)] }),
    booking({
      status: 'Cancelled',
      sellingPrice: 90_000,
      clientCancellationCharge: 10_000,
      lines: [line({ dmcId: 'd1', netCost: 70_000, dmcCancellationCharge: 4_000 })],
      clientPayments: [pay(30_000)],
      dmcPayments: [dmcPay('d1', 9_000)],
    }),
  ]);

  it('excludes Pending from counts and money but reports it as pipeline', () => {
    expect(t.pending).toEqual({ count: 1, sellingPrice: 50_000 });
    expect(t.bookings).toBe(2);
  });

  it('includes Cancelled money via Cancellation Charges but not in counts', () => {
    expect(t.sellingPrice).toBe(100_000 + 20_000 + 10_000);
    expect(t.netCost).toBe(80_000 + 15_000 + 4_000);
    expect(t.commission).toBe(20_000 + 5_000 + 6_000);
    expect(t.cancelled).toBe(1);
    expect(t.cancellationRate).toBeCloseTo(1 / 3);
  });

  it('lists negative outstanding separately, never netted', () => {
    expect(t.clientOutstanding).toBe(60_000);
    expect(t.clientRefundsOwed).toBe(20_000);
    expect(t.dmcOutstanding).toBe(80_000 + 15_000);
    expect(t.dmcDueBack).toBe(5_000);
  });

  it('has no cancellation rate without decided Bookings', () => {
    expect(totals([booking({ status: 'Pending' })]).cancellationRate).toBeNull();
  });
});

describe('IST dates', () => {
  it('rolls over at IST midnight, not UTC', () => {
    expect(todayIST(new Date('2026-10-31T18:29:59Z'))).toBe('2026-10-31');
    expect(todayIST(new Date('2026-10-31T18:30:00Z'))).toBe('2026-11-01');
    expect(toISTDate(new Date('2026-11-01T20:00:00Z'))).toBe('2026-11-02');
  });

  it('derives the FY around 31 Mar / 1 Apr', () => {
    expect(fyOf('2027-03-31')).toBe('2026-27');
    expect(fyOf('2027-04-01')).toBe('2027-28');
    expect(fyOf('2099-12-01')).toBe('2099-00');
    expect(fyOf(todayIST(new Date('2027-03-31T18:30:00Z')))).toBe('2027-28'); // 1 Apr 00:00 IST
    expect(fyRange('2026-27')).toEqual({ from: '2026-04-01', to: '2027-03-31' });
  });

  it('formats and steps months', () => {
    expect(formatDate('2026-11-01')).toBe('1 Nov 2026');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthEnd('2028-02')).toBe('2028-02-29');
  });
});

describe('flags', () => {
  const today = '2026-11-10';

  it('flags travel ended for Confirmed / Voucher Received only', () => {
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '2026-11-09', status: 'Confirmed' }), today)).toBe(true);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '2026-11-09', status: 'Voucher Received' }), today)).toBe(true);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '2026-11-10', status: 'Confirmed' }), today)).toBe(false);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '2026-11-09', status: 'Completed' }), today)).toBe(false);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '2026-11-09', status: 'Pending' }), today)).toBe(false);
  });

  it('travelEnded uses the latest line end when travelEnd is empty; false with no dates', () => {
    const lines = [line({ end: '2026-11-05' }), line({ end: '2026-11-09' })];
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '', lines }), today)).toBe(true);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '', lines: [line({ end: '2026-11-10' })] }), today)).toBe(false);
    expect(travelEndedNotCompleted(booking({ travelStart: '2026-11-01', travelEnd: '', lines: [line()] }), today)).toBe(false);
  });

  it('travelEnded never fires from an end date before the Booking date', () => {
    const early = booking({ travelStart: '2026-11-20', travelEnd: '2026-11-05', status: 'Confirmed' });
    expect(travelEndedNotCompleted(early, today)).toBe(false);
    expect(travelEndedNotCompleted({ ...early, travelEnd: '2026-11-09', travelStart: '2026-11-05' }, today)).toBe(true);
  });

  it('flags a Customer balance overdue only after the due date and while owed', () => {
    const b = booking({ sellingPrice: 10_000, clientBalanceDueBy: '2026-11-09' });
    expect(bookingFlags(b, today).clientOverdue).toBe(true);
    expect(bookingFlags({ ...b, clientBalanceDueBy: today }, today).clientOverdue).toBe(false);
    expect(bookingFlags({ ...b, clientPayments: [pay(10_000)] }, today).clientOverdue).toBe(false);
    expect(bookingFlags({ ...b, status: 'Pending' }, today).clientOverdue).toBe(false);
  });

  it('flags DMC payments due within 7 days or overdue while that DMC is owed', () => {
    const b = booking({
      lines: [
        line({ dmcId: 'd1', netCost: 1_000, dmcPayBy: '2026-11-09' }),
        line({ dmcId: 'd2', netCost: 1_000, dmcPayBy: '2026-11-17' }),
        line({ dmcId: 'd2', netCost: 1_000, dmcPayBy: '2026-11-18' }),
      ],
    });
    const f = bookingFlags(b, today);
    expect(f.dmcDue.map((d) => [d.dmcPayBy, d.state])).toEqual([
      ['2026-11-09', 'overdue'],
      ['2026-11-17', 'due'],
    ]);
    expect(f.dmcOverdue && f.dmcDueSoon).toBe(true);
    const paid = bookingFlags({ ...b, dmcPayments: [dmcPay('d1', 1_000)] }, today);
    expect(paid.dmcOverdue).toBe(false);
  });

  it('uses the IST date around midnight', () => {
    const b = booking({ sellingPrice: 1, clientBalanceDueBy: '2026-11-09' });
    expect(bookingFlags(b, todayIST(new Date('2026-11-09T18:29:00Z'))).clientOverdue).toBe(false);
    expect(bookingFlags(b, todayIST(new Date('2026-11-09T18:31:00Z'))).clientOverdue).toBe(true);
  });
});

describe('numbering and documents', () => {
  it('formats Booking IDs with min 3 digits', () => {
    expect(formatBookingNo(1)).toBe('UDN-001');
    expect(formatBookingNo(42)).toBe('UDN-042');
    expect(formatBookingNo(1000)).toBe('UDN-1000');
    expect(parseBookingNo('udn-1000')).toBe(1000);
    expect(parseBookingNo('UDN-1')).toBeNull();
  });

  it('formats invoice numbers per FY', () => {
    expect(formatInvoiceNo('2026-27', 1)).toBe('UDAN/2026-27/001');
    expect(formatInvoiceNo('2026-27', 1234)).toBe('UDAN/2026-27/1234');
    expect(invoiceSeries('2027-03-31')).toEqual({ fy: '2026-27', counterId: 'invoice-2026-27' });
    expect(invoiceSeries('2027-04-01').counterId).toBe('invoice-2027-28');
  });

  it('builds filenames, share message, subject and WhatsApp link', () => {
    expect(invoiceFilename('UDAN/2026-27/001')).toBe('UDAN-Invoice-UDAN_2026-27_001.pdf');
    expect(voucherFilename('UDN-001')).toBe('UDAN-Voucher-UDN-001.pdf');
    const input = { clientName: 'Asha  Patel', bookingNo: 'UDN-001', invoiceNo: 'UDAN/2026-27/001', tradingName: 'UDAN Immigration & Tours' };
    expect(shareMessage({ ...input, kind: 'invoice' })).toBe(
      'Hi Asha, please find your invoice for booking UDN-001 attached. — UDAN Immigration & Tours',
    );
    expect(shareMessage({ ...input, kind: 'voucher' })).toContain('your travel voucher for booking UDN-001');
    expect(emailSubject({ ...input, kind: 'invoice' })).toBe('Invoice UDAN/2026-27/001 — UDAN Immigration & Tours');
    expect(emailSubject({ ...input, kind: 'voucher' })).toBe('Travel voucher UDN-001 — UDAN Immigration & Tours');
    expect(whatsappUrl('+919876543210', 'Hi & bye')).toBe('https://wa.me/919876543210?text=Hi%20%26%20bye');
  });
});

describe('validation', () => {
  const base: Partial<BookingEditableFields> = { category: 'Hotel', hasTravel: false, sellingPrice: 0, pax: { adults: 1, children: 0, infants: 0 }, travellerNames: [], lines: [line()] };
  it('requires a Category; skips Travel checks when Travel is not added', () => {
    expect(validateBookingFields({ ...base, category: undefined }, { requireClient: false })).toHaveProperty('category');
    expect(validateBookingFields({ ...base, destination: '', travelStart: '' }, { requireClient: false })).toEqual({});
    expect(Object.keys(validateBookingFields({ ...base, hasTravel: true, destination: ' ', travelStart: '2026-11-10', travelEnd: '2026-11-09' }, { requireClient: false })).sort()).toEqual(['destination', 'travelEnd']);
  });
  it('Package needs Trip Scope and ≥1 line; single Categories exactly 1 line', () => {
    expect(validateBookingFields({ ...base, category: 'Package', lines: [] }, { requireClient: false })).toEqual({ tripScope: 'Choose Domestic or International.', lines: 'Add at least one service.' });
    expect(validateBookingFields({ ...base, lines: [line(), line()] }, { requireClient: false })).toHaveProperty('lines');
  });
  it('Contact person is optional; a number must be E.164', () => {
    const v = (o: object) => validateBookingFields({ ...base, ...o }, { requireClient: false });
    expect(v({ contactName: 'Mehul', contactPhone: '+919825011224' })).toEqual({});
    expect(v({ contactName: 'Mehul' })).toEqual({});
    expect(v({ contactPhone: '98250' })).toHaveProperty('contactPhone');
  });
  it('travellers are optional on every Category', () => {
    for (const category of ['Passport', 'Hotel'] as const) {
      const e = validateBookingFields(
        { ...base, category, hasTravel: false, pax: { adults: 0, children: 0, infants: 0 }, travellerNames: [], lines: [line({ type: category })] },
        { requireClient: false },
      );
      expect(e).not.toHaveProperty('pax');
      expect(e).not.toHaveProperty('travellerNames');
    }
  });
  it('travel end is optional (≥ start when entered); Visa/Passport cannot have travel details', () => {
    const travel = { ...base, category: 'Flight' as const, hasTravel: true, destination: 'Delhi', travelStart: '2026-12-01', lines: [line({ type: 'Flight' })] };
    const v = (o: object) => validateBookingFields({ ...travel, ...o }, { requireClient: false });
    expect(v({ travelEnd: '' })).toEqual({});
    expect(v({ travelEnd: '2026-11-30' })).toHaveProperty('travelEnd');
    expect(v({ category: 'Visa', lines: [line({ type: 'Visa', visaType: 'Visitor', visaCountry: 'UAE' })] })).toHaveProperty('hasTravel');
  });
  it('DMC optional on lines; Visa lines need type and country', () => {
    expect(validateLine(line({ dmcId: undefined }))).toEqual({});
    expect(validateLine(line({ type: 'Visa' }))).toEqual({ visaType: 'Choose a visa type.', visaCountry: 'Enter the country.' });
  });
  it('a tagged payment must point at a line on the Booking (DMC: of that DMC)', () => {
    const lines = [line({ id: 'la', dmcId: 'd1' }), line({ id: 'lb', dmcId: undefined })];
    const p = { date: '2026-11-01', kind: 'Payment', mode: 'UPI', amount: 5 } as const;
    expect(validatePayment({ ...p, lineId: 'zz' }, undefined, lines)).toHaveProperty('lineId');
    expect(validatePayment({ ...p, lineId: 'lb' }, undefined, lines)).toEqual({});
    expect(validatePayment({ ...p, dmcId: 'd1', lineId: 'lb' }, ['d1'], lines)).toEqual({ lineId: 'Choose a service from this DMC.' });
  });

  it('requires payments > 0 and a DMC on the Booking', () => {
    expect(validatePayment({ date: '2026-11-01', kind: 'Payment', mode: 'UPI', amount: 0 })).toHaveProperty('amount');
    expect(validatePayment({ date: '2026-11-01', kind: 'Refund', mode: 'Cash', amount: 5, dmcId: 'd9' }, ['d1'])).toHaveProperty('dmcId');
    expect(validatePayment({ date: '2026-11-01', kind: 'Refund', mode: 'Cash', amount: 5, dmcId: 'd1' }, ['d1'])).toEqual({});
  });
});
