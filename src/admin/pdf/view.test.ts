/** Invoice and Voucher view-models: what each document prints for the spec's cases. */
import { describe, expect, it } from 'vitest';
import { cancelledSample, FULL_PROFILE, SAMPLE_CLIENT, SAMPLE_DMCS, sampleBooking } from './sampleData';
import { invoiceView, upiPayUri, voucherView } from './view';

const SEEDED = { tradingName: 'UDAN Immigration & Tours', address: 'Vastrapur\nAhmedabad', phones: '+91 96872 32015' };

describe('Invoice view-model', () => {
  it('partial payment: price, payments, Balance due with due date, Payment details with a UPI QR for the balance', () => {
    const v = invoiceView({ booking: sampleBooking(), client: SAMPLE_CLIENT, profile: FULL_PROFILE });
    expect(v.invoiceNo).toBe('UDAN/2026-27/001');
    expect(v.dateLine).toBe('Date 1 Nov 2026');
    expect(v.bookingLine).toBe('Booking UDN-001');
    expect(v.cancelledPill).toBe(false);
    expect(v.cancelledNote).toBeUndefined();
    expect(v.billedTo).toEqual({ name: 'Rahul Patel', lines: ['+91 98250 11223', 'rahul.patel@example.com', 'Ahmedabad'] });
    expect(v.from.name).toBe('UDAN Immigration & Tours');
    expect(v.from.lines).toContain('hello@udantours.in');
    expect(v.item).toEqual({
      title: 'Holiday package — Kerala — Kochi, Munnar, Alleppey',
      detail: '18 Dec 2026 – 24 Dec 2026 · 2 adults, 1 child',
      amount: '₹1,48,500',
    });
    expect(v.services).toEqual([
      { type: 'Transfer', description: 'Airport pickup, Kochi → Munnar (Innova)', dates: '18 Dec 2026' },
      { type: 'Hotel', description: 'Tea County Munnar, 3N, Deluxe room, breakfast', dates: '18 Dec 2026 – 21 Dec 2026' },
      { type: 'Hotel', description: 'Alleppey premium houseboat, 1N, all meals', dates: '23 Dec 2026 – 24 Dec 2026' },
      { type: 'Sightseeing', description: 'Thekkady spice plantation tour', dates: '21 Dec 2026' },
      { type: 'Other', description: 'Travel insurance, 3 travellers', dates: '—' },
    ]);
    expect(v.servicesStruck).toBe(false);
    expect(v.originalPrice).toBeUndefined();
    expect(v.totals.lines).toEqual([
      { label: 'Package price', amount: '₹1,48,500', muted: false },
      { label: 'Received 28 Oct 2026 · UPI', amount: '− ₹50,000', muted: true },
      { label: 'Received 15 Nov 2026 · Bank transfer', amount: '− ₹40,000', muted: true },
    ]);
    expect(v.totals.result).toEqual({ label: 'Balance due', amount: '₹58,500', tone: 'danger', note: 'by 1 Dec 2026' });
    expect(v.balance).toBe(58_500);
    expect(v.payment?.bank).toEqual(['UDAN Immigration & Tours', 'A/c 50200012345678', 'IFSC HDFC0001234', 'HDFC Bank, Vastrapur']);
    expect(v.payment?.upiId).toBe('udantours@hdfcbank');
    expect(v.payment?.qr).toEqual({
      uri: 'upi://pay?pa=udantours%40hdfcbank&pn=UDAN%20Immigration%20%26%20Tours&am=58500&cu=INR&tn=UDAN%2F2026-27%2F001',
      caption: 'Scan to pay ₹58,500',
    });
    expect(v.terms).toHaveLength(2);
    expect(v.footer).toEqual(['Thank you for travelling with UDAN Immigration & Tours.', 'This is not a tax invoice.']);
  });

  it('never prints a DMC name or a line cost', () => {
    const json = JSON.stringify(invoiceView({ booking: sampleBooking(), client: SAMPLE_CLIENT, profile: FULL_PROFILE }));
    for (const dmc of SAMPLE_DMCS) expect(json).not.toContain(dmc.name);
    expect(json).not.toMatch(/52,000|52000|SCT-88412/);
  });

  it('paid in full: Paid in full, no Payment details, refunds listed as +', () => {
    const v = invoiceView({
      booking: sampleBooking({
        clientPayments: [
          { id: 'p1', kind: 'Payment', date: '2026-11-15', amount: 150_000, mode: 'Bank transfer' },
          { id: 'p2', kind: 'Refund', date: '2026-10-28', amount: 1_500, mode: 'UPI' },
        ],
      }),
      client: SAMPLE_CLIENT,
      profile: FULL_PROFILE,
    });
    expect(v.totals.lines.slice(1)).toEqual([
      { label: 'Refunded 28 Oct 2026 · UPI', amount: '+ ₹1,500', muted: true },
      { label: 'Received 15 Nov 2026 · Bank transfer', amount: '− ₹1,50,000', muted: true },
    ]);
    expect(v.totals.result).toEqual({ label: 'Paid in full', amount: '₹0', tone: 'action' });
    expect(v.payment).toBeUndefined();
  });

  it('cancelled with a refund due: pill, sentence, cancellation charge, struck services, Refund due to you', () => {
    const v = invoiceView({ booking: cancelledSample(), client: SAMPLE_CLIENT, profile: FULL_PROFILE });
    expect(v.cancelledPill).toBe(true);
    expect(v.cancelledNote).toBe(
      'This booking was cancelled on 5 Dec 2026. The package price of ₹1,48,500 is replaced by the cancellation charge below.',
    );
    expect(v.item.title).toBe('Cancellation charge — Kerala — Kochi, Munnar, Alleppey');
    expect(v.item.amount).toBe('₹40,000');
    expect(v.servicesStruck).toBe(true);
    expect(v.services).toHaveLength(5);
    expect(v.originalPrice).toEqual({ label: 'Original package price (all services above)', amount: '₹1,48,500' });
    expect(v.totals.lines[0]).toEqual({ label: 'Cancellation charge', amount: '₹40,000', muted: false });
    expect(v.totals.lines).toHaveLength(3);
    expect(v.totals.result).toEqual({ label: 'Refund due to you', amount: '₹50,000', tone: 'warn' });
    expect(v.balance).toBe(-50_000);
    expect(v.payment).toBeUndefined();
  });

  it('cancelled with a balance due: Balance due on the charge, Payment details shown', () => {
    const v = invoiceView({
      booking: cancelledSample({ clientCancellationCharge: 100_000, clientBalanceDueBy: undefined }),
      client: SAMPLE_CLIENT,
      profile: FULL_PROFILE,
    });
    expect(v.totals.result).toEqual({ label: 'Balance due', amount: '₹10,000', tone: 'danger', note: undefined });
    expect(v.payment?.qr?.caption).toBe('Scan to pay ₹10,000');
  });

  it('empty Business profile: nothing from the profile prints, generic footer, no Payment details even with a balance', () => {
    const v = invoiceView({ booking: sampleBooking(), client: { id: 'c9', name: 'Asha', mobile: '+919811111111' }, profile: {} });
    expect(v.from).toEqual({ name: undefined, lines: [] });
    expect(v.billedTo).toEqual({ name: 'Asha', lines: ['+91 98111 11111'] });
    expect(v.balance).toBeGreaterThan(0);
    expect(v.payment).toBeUndefined();
    expect(v.terms).toEqual([]);
    expect(v.signature).toBeUndefined();
    expect(v.footer).toEqual(['Thank you for travelling with us.', 'This is not a tax invoice.']);
  });

  it('seeded profile: UPI only → QR without bank lines; signature captioned with the trading name', () => {
    const v = invoiceView({
      booking: sampleBooking(),
      client: SAMPLE_CLIENT,
      profile: { ...SEEDED, upiId: 'udan@upi', signature: 'data:image/png;base64,AAAA', invoiceTerms: '  ' },
    });
    expect(v.payment?.bank).toEqual([]);
    expect(v.payment?.qr?.uri).toContain('pa=udan%40upi');
    expect(v.signature).toEqual({ image: 'data:image/png;base64,AAAA', caption: 'For UDAN Immigration & Tours' });
    expect(v.terms).toEqual([]);
  });

  it('refuses to build without an invoice number', () => {
    expect(() => invoiceView({ booking: sampleBooking({ invoiceNo: undefined }), client: SAMPLE_CLIENT, profile: {} })).toThrow(/invoice number/);
  });

  it('UPI URI leaves out the payee when there is no trading name', () => {
    expect(upiPayUri({ upiId: 'a@b', amount: 10, note: 'X/1' })).toBe('upi://pay?pa=a%40b&am=10&cu=INR&tn=X%2F1');
  });
});

describe('Voucher view-model', () => {
  const view = (booking = sampleBooking(), profile = FULL_PROFILE) => voucherView({ booking, client: SAMPLE_CLIENT, profile, today: '2026-11-20' });

  it('header, guest, trip and emergency contacts', () => {
    const v = view();
    expect(v.bookingLine).toBe('Booking UDN-001');
    expect(v.issuedLine).toBe('Issued 20 Nov 2026');
    expect(v.guest).toEqual({ name: 'Rahul Patel', lines: ['+91 98250 11223'], travellers: 'Travellers: Rahul Patel, Neha Patel, Aarav Patel' });
    expect(v.trip).toEqual({ destination: 'Kerala — Kochi, Munnar, Alleppey', dates: '18 Dec 2026 – 24 Dec 2026', pax: '2 adults, 1 child' });
    expect(v.emergency).toEqual(['+91 96872 32015 (Dolly, 24×7)', '+91 98989 40112 (Ops desk)']);
    expect(v.goodToKnow).toHaveLength(3);
    expect(v.itinerary[0]).toBe('Day 1: Arrive Kochi, Fort Kochi walk');
    expect(v.footer).toBe('UDAN Immigration & Tours · +91 96872 32015 · hello@udantours.in · udantours.in');
  });

  it('timeline: dated lines grouped by start date in order; undated lines under Throughout your trip', () => {
    const v = view();
    expect(v.days.map((d) => [d.label, d.items.map((i) => i.description)])).toEqual([
      ['18 Dec', ['Airport pickup, Kochi → Munnar (Innova)', 'Tea County Munnar, 3N, Deluxe room, breakfast']],
      ['21 Dec', ['Thekkady spice plantation tour']],
      ['23 Dec', ['Alleppey premium houseboat, 1N, all meals']],
    ]);
    expect(v.days[0].items[1]).toEqual({
      type: 'Hotel',
      description: 'Tea County Munnar, 3N, Deluxe room, breakfast',
      until: 'until 21 Dec 2026',
      notes: 'Early check-in requested.',
      confirmation: { text: 'TCM-55120', pending: false },
    });
    expect(v.days[0].items[0].until).toBeUndefined();
    expect(v.throughout).toEqual([
      { type: 'Other', description: 'Travel insurance, 3 travellers', until: undefined, notes: undefined, confirmation: { text: 'POL-77310', pending: false } },
    ]);
  });

  it('missing confirmation number prints "To be confirmed" (still allowed)', () => {
    const v = view();
    expect(v.days[2].items[0].confirmation).toEqual({ text: 'To be confirmed', pending: true });
  });

  it('never contains a DMC name, a cost or any payment', () => {
    const b = sampleBooking();
    const json = JSON.stringify(view(b));
    for (const dmc of SAMPLE_DMCS) expect(json).not.toContain(dmc.name);
    expect(json).not.toContain('₹');
    expect(json).not.toMatch(/netCost|dmcId|sellingPrice|amount|balance/i);
    const amounts = [b.sellingPrice, ...b.lines.map((l) => l.netCost), ...b.clientPayments.map((p) => p.amount), ...b.dmcPayments.map((p) => p.amount)];
    for (const n of amounts) {
      expect(json).not.toContain(String(n));
      expect(json).not.toContain(n.toLocaleString('en-IN'));
    }
  });

  it('empty Business profile: no emergency column, no notes, no footer; empty itinerary hidden', () => {
    const v = voucherView({ booking: sampleBooking({ itinerary: '  ', travellerNames: [] }), client: SAMPLE_CLIENT, profile: {}, today: '2026-11-20' });
    expect(v.emergency).toEqual([]);
    expect(v.goodToKnow).toEqual([]);
    expect(v.footer).toBe('');
    expect(v.itinerary).toEqual([]);
    expect(v.guest.travellers).toBeUndefined();
  });

  it('emergency contact falls back to the business phones', () => {
    const v = view(sampleBooking(), { ...SEEDED, phones: '+91 96872 32015, +91 79 2630 0000' });
    expect(v.emergency).toEqual(['+91 96872 32015', '+91 79 2630 0000']);
  });

  it('is not built for a cancelled booking', () => {
    expect(() => view(cancelledSample())).toThrow(/cancelled/);
  });
});
