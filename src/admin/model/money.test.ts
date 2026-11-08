import { describe, expect, it } from 'vitest';
import { bookingMoney, formatINR, linesMissingConfirmation, lineDmcIds } from './money';
import { booking, dmcPay, line, pay, refund } from './testFixtures';

describe('bookingMoney: not cancelled', () => {
  const b = booking({
    sellingPrice: 148_500,
    lines: [
      line({ dmcId: 'd1', netCost: 80_000 }),
      line({ dmcId: 'd2', netCost: 30_000 }),
      line({ dmcId: 'd1', netCost: 10_000 }),
    ],
    clientPayments: [pay(100_000), pay(20_000), refund(5_000)],
    dmcPayments: [dmcPay('d1', 50_000), dmcPay('d2', 30_000), dmcPay('d1', 2_000, { kind: 'Refund' })],
  });
  const m = bookingMoney(b);

  it('computes Net Cost, Commission and Customer outstanding', () => {
    expect(m).toMatchObject({
      cancelled: false,
      sellingPrice: 148_500,
      netCost: 120_000,
      commission: 28_500,
      clientPaid: 120_000,
      clientRefunded: 5_000,
      clientNetReceived: 115_000,
      clientOutstanding: 33_500,
    });
  });

  it('computes outstanding per DMC and in total', () => {
    expect(m.dmcs).toEqual([
      { dmcId: 'd1', cost: 90_000, paid: 50_000, refunded: 2_000, netPaid: 48_000, outstanding: 42_000 },
      { dmcId: 'd2', cost: 30_000, paid: 30_000, refunded: 0, netPaid: 30_000, outstanding: 0 },
    ]);
    expect(m.dmcOutstanding).toBe(42_000);
  });

  it('goes negative when the Customer overpays (refund owed)', () => {
    expect(bookingMoney(booking({ sellingPrice: 10_000, clientPayments: [pay(12_000)] })).clientOutstanding).toBe(-2_000);
  });

  it('keeps a deleted line’s DMC payments, so that DMC is due back', () => {
    const after = bookingMoney(booking({ lines: [line({ dmcId: 'd1', netCost: 5_000 })], dmcPayments: [dmcPay('d2', 7_000)] }));
    expect(after.dmcs.find((d) => d.dmcId === 'd2')).toMatchObject({ cost: 0, netPaid: 7_000, outstanding: -7_000 });
    expect(after.dmcOutstanding).toBe(5_000 - 7_000);
  });
});

describe('bookingMoney: cancelled', () => {
  const b = booking({
    status: 'Cancelled',
    sellingPrice: 100_000,
    clientCancellationCharge: 20_000,
    lines: [
      line({ dmcId: 'd1', netCost: 60_000, dmcCancellationCharge: 10_000 }),
      line({ dmcId: 'd2', netCost: 20_000 }), // charge defaults to 0
    ],
    clientPayments: [pay(50_000)],
    dmcPayments: [dmcPay('d1', 30_000), dmcPay('d2', 5_000)],
  });
  const m = bookingMoney(b);

  it('replaces Selling Price and Net Cost with the Cancellation Charges', () => {
    expect(m).toMatchObject({ cancelled: true, sellingPrice: 20_000, netCost: 10_000, commission: 10_000 });
  });

  it('shows a refund owed to the Customer as negative outstanding', () => {
    expect(m.clientOutstanding).toBe(-30_000);
  });

  it('shows money due back from each DMC as negative outstanding', () => {
    expect(m.dmcs.map((d) => [d.dmcId, d.outstanding])).toEqual([
      ['d1', -20_000],
      ['d2', -5_000],
    ]);
  });

  it('can leave the Customer still owing', () => {
    expect(bookingMoney({ ...b, clientPayments: [pay(5_000)] }).clientOutstanding).toBe(15_000);
  });

  it('treats a missing Customer Cancellation Charge as 0', () => {
    expect(bookingMoney({ ...b, clientCancellationCharge: undefined }).sellingPrice).toBe(0);
  });
});

describe('helpers', () => {
  it('formats INR with en-IN grouping', () => {
    expect(formatINR(148_500)).toBe('₹1,48,500');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(12_34_56_789)).toBe('₹12,34,56,789');
    expect(formatINR(-1_000)).toBe('−₹1,000');
  });

  it('lists lines missing a confirmation number and unique line DMCs', () => {
    const b = booking({ lines: [line({ dmcId: 'd1', confirmationNo: 'ABC' }), line({ dmcId: 'd2', confirmationNo: ' ' }), line({ dmcId: 'd1' })] });
    expect(linesMissingConfirmation(b)).toHaveLength(2);
    expect(lineDmcIds(b)).toEqual(['d1', 'd2']);
  });
});
