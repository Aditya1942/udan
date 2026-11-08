/** Live document links: what a share doc stores (customer-safe) and the message placeholders. */
import { describe, expect, it } from 'vitest';
import { cancelledSample, FULL_PROFILE, SAMPLE_CLIENT, sampleBooking } from './sampleData';
import { messageVars, samePayload, sharePayload } from './share';

const invoiced = (o = {}) => sampleBooking({ invoiceNo: 'UDAN/2026-27/001', invoiceSeq: 1, invoiceDate: '2026-11-01', ...o });

describe('sharePayload', () => {
  it('Invoice: stores the invoice view-model only — never DMCs, net cost or internal notes', () => {
    const booking = invoiced({ internalNotes: 'Secret margin note' });
    const p = sharePayload({ kind: 'invoice', booking, client: SAMPLE_CLIENT, profile: FULL_PROFILE, issuedOn: '2026-11-08' });
    expect(p).toMatchObject({ title: 'Invoice UDAN/2026-27/001', filename: 'UDAN-Invoice-UDAN_2026-27_001.pdf', tradingName: 'UDAN Immigration & Tours', phone: '+91 96872 32015' });
    expect(p.unavailable).toBeUndefined();
    const view = JSON.parse(p.view);
    expect(view.invoiceNo).toBe('UDAN/2026-27/001');
    for (const secret of ['Kerala Trails DMC', 'Secret margin note', 'netCost', 'dmcId', 'commission']) expect(p.view).not.toContain(secret);
  });

  it('Invoice without a number / cancelled Voucher: no document, a reason instead', () => {
    expect(sharePayload({ kind: 'invoice', booking: sampleBooking({ invoiceNo: undefined, invoiceSeq: undefined, invoiceDate: undefined }), profile: FULL_PROFILE, issuedOn: '2026-11-08' })).toMatchObject({
      view: '',
      unavailable: 'not-invoiced',
    });
    expect(sharePayload({ kind: 'voucher', booking: cancelledSample(), profile: FULL_PROFILE, issuedOn: '2026-11-08' })).toMatchObject({
      view: '',
      unavailable: 'cancelled',
      title: 'Travel voucher UDN-001',
    });
  });

  it('Voucher: issue date = the share date, so syncing does not churn daily', () => {
    const p = sharePayload({ kind: 'voucher', booking: sampleBooking(), client: SAMPLE_CLIENT, profile: FULL_PROFILE, issuedOn: '2026-11-08' });
    expect(JSON.parse(p.view).issueDate).toBe('8 Nov 2026');
    for (const secret of ['Kerala Trails DMC', 'netCost', 'sellingPrice', '₹']) expect(p.view).not.toContain(secret);
    expect(samePayload(p, sharePayload({ kind: 'voucher', booking: sampleBooking(), client: SAMPLE_CLIENT, profile: FULL_PROFILE, issuedOn: '2026-11-08' }))).toBe(true);
    expect(samePayload(p, sharePayload({ kind: 'voucher', booking: sampleBooking({ destination: 'Goa' }), client: SAMPLE_CLIENT, profile: FULL_PROFILE, issuedOn: '2026-11-08' }))).toBe(false);
  });
});

describe('messageVars', () => {
  const base = { client: SAMPLE_CLIENT, profile: FULL_PROFILE, today: '2026-11-08', link: 'https://udantours.in/d/abc' };

  it('Invoice: payment sentence follows the balance', () => {
    const due = messageVars({ ...base, kind: 'invoice', booking: invoiced({ clientBalanceDueBy: '2026-11-25' }) });
    expect(due).toMatchObject({ name: 'Rahul', invoiceNo: 'UDAN/2026-27/001', link: 'https://udantours.in/d/abc', phone: '+91 96872 32015' });
    expect(due.paymentLine).toMatch(/^Balance due: ₹[\d,]+ by 25 Nov 2026\. Bank and UPI details are on the invoice\.$/);
    expect(due.trip).toBe('Kerala — Kochi, Munnar, Alleppey (18 Dec 2026 – 24 Dec 2026)');

    const booking = invoiced();
    const paid = messageVars({ ...base, kind: 'invoice', booking: { ...booking, clientPayments: [{ id: 'p', kind: 'Payment', date: '2026-11-02', amount: booking.sellingPrice, mode: 'UPI' }] } });
    expect(paid.paymentLine).toBe('Paid in full. Thank you!');

    const refund = messageVars({ ...base, kind: 'invoice', booking: { ...cancelledSample(), invoiceNo: 'UDAN/2026-27/001', invoiceSeq: 1, invoiceDate: '2026-11-01' } });
    expect(refund.paymentLine).toMatch(/^Refund due to you: ₹/);
  });

  it('Voucher: pending sentence only when lines are To be confirmed', () => {
    expect(messageVars({ ...base, kind: 'voucher', booking: sampleBooking() }).pendingLine).toBe(
      '1 service is still being confirmed. This link updates automatically once it is.',
    );
    const all = sampleBooking();
    const confirmed = { ...all, lines: all.lines.map((l) => ({ ...l, confirmationNo: l.confirmationNo || 'X1' })) };
    expect(messageVars({ ...base, kind: 'voucher', booking: confirmed }).pendingLine).toBe('');
  });
});
