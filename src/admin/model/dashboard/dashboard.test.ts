import { describe, expect, it } from 'vitest';
import { booking, clients, dmcPay, dmcs, enquiry, line, pay } from '../testFixtures';
import { allocate, dmcPayables, enquiryFunnel, insights, insightsPeriod, previousPeriod } from './insights';
import { monthStats, needsAttention } from './overview';
import { buildBookingRows } from './rows';
import { applyTableQuery, defaultTableQuery, parseTableQuery, tableFooter, tableQueryToParams, type TableQuery } from './table';
import { clientSummary, dmcSummary } from './directory';

const today = '2026-11-10';

const bookings = [
  booking({
    bookingSeq: 1,
    clientId: 'c1',
    destination: 'Dubai',
    travelStart: '2026-11-20',
    travelEnd: '2026-11-25',
    sellingPrice: 100_000,
    clientBalanceDueBy: '2026-11-05',
    lines: [line({ dmcId: 'd1', netCost: 80_000, confirmationNo: 'GH-77', dmcPayBy: '2026-11-12' })],
    clientPayments: [pay(40_000)],
    travellerNames: ['Kiran Patel'],
    createdAt: new Date('2026-10-02T05:00:00Z'),
  }),
  booking({
    bookingSeq: 2,
    clientId: 'c2',
    status: 'Pending',
    destination: 'Kerala',
    travelStart: '2026-11-03',
    travelEnd: '2026-11-08',
    sellingPrice: 60_000,
    lines: [line({ dmcId: 'd2', type: 'Transfer', netCost: 50_000 })],
  }),
  booking({
    bookingSeq: 3,
    clientId: 'c2',
    status: 'Voucher Received',
    destination: 'kerala ',
    travelStart: '2026-11-01',
    travelEnd: '2026-11-06',
    sellingPrice: 30_000,
    invoiceNo: 'UDAN/2026-27/001',
    lines: [line({ dmcId: 'd2', type: 'Transfer', netCost: 20_000, dmcPayBy: '2026-10-30' })],
    clientPayments: [pay(30_000)],
    dmcPayments: [dmcPay('d2', 5_000)],
    createdAt: new Date('2026-09-01T05:00:00Z'),
  }),
  booking({
    bookingSeq: 4,
    clientId: 'c1',
    status: 'Cancelled',
    destination: 'Bali',
    travelStart: '2026-12-01',
    travelEnd: '2026-12-05',
    sellingPrice: 90_000,
    clientCancellationCharge: 10_000,
    lines: [line({ dmcId: 'd1', netCost: 70_000, dmcCancellationCharge: 2_000 })],
    clientPayments: [pay(25_000)],
    dmcPayments: [dmcPay('d1', 6_000)],
  }),
];
const rows = buildBookingRows(bookings, clients, dmcs, today);
const q = (over: Partial<TableQuery> = {}): TableQuery => ({ ...defaultTableQuery(today), ...over });
const nos = (rs: typeof rows) => rs.map((r) => r.booking.bookingNo);

describe('table: scope, search, filters, sort', () => {
  it('defaults to the current month by travelStart, sorted by travel start', () => {
    expect(nos(applyTableQuery(rows, q()))).toEqual(['UDN-003', 'UDN-002', 'UDN-001']);
  });

  it('searches Client, mobile, DMC, confirmation and traveller names case-insensitively', () => {
    const all = (text: string) => nos(applyTableQuery(rows, q({ scope: 'all', q: text })));
    expect(all('ASHA')).toEqual(['UDN-001', 'UDN-004']);
    expect(all('98123')).toEqual(['UDN-003', 'UDN-002']);
    expect(all('trails')).toEqual(['UDN-003', 'UDN-002']);
    expect(all('gh-77')).toEqual(['UDN-001']);
    expect(all('kiran')).toEqual(['UDN-001']);
    expect(all('2026-27/001')).toEqual(['UDN-003']);
    expect(all('udn-004')).toEqual(['UDN-004']);
  });

  it('lets a date range override the month scope', () => {
    const r = applyTableQuery(rows, q({ month: '2026-01', dateField: 'bookedOn', from: '2026-09-01', to: '2026-09-30' }));
    expect(nos(r)).toEqual(['UDN-003']);
  });

  it('filters by status, DMC, line type, payment state, invoice and flag', () => {
    const all = (over: Partial<TableQuery>) => nos(applyTableQuery(rows, q({ scope: 'all', sort: 'bookingNo', ...over })));
    expect(all({ status: ['Pending', 'Cancelled'] })).toEqual(['UDN-002', 'UDN-004']);
    expect(all({ dmcIds: ['d1'] })).toEqual(['UDN-001', 'UDN-004']);
    expect(all({ lineTypes: ['Transfer'] })).toEqual(['UDN-002', 'UDN-003']);
    expect(all({ clientPayment: 'overdue' })).toEqual(['UDN-001']);
    expect(all({ clientPayment: 'refund' })).toEqual(['UDN-004']);
    expect(all({ clientPayment: 'paid' })).toEqual(['UDN-003']);
    expect(all({ dmcPayment: 'due7' })).toEqual(['UDN-001']);
    expect(all({ dmcPayment: 'overdue' })).toEqual(['UDN-003']);
    expect(all({ invoice: 'generated' })).toEqual(['UDN-003']);
    expect(all({ travelEnded: true })).toEqual(['UDN-003']);
    expect(all({ clientId: 'c2' })).toEqual(['UDN-002', 'UDN-003']);
  });

  it('sorts by status lifecycle and money, desc', () => {
    expect(nos(applyTableQuery(rows, q({ scope: 'all', sort: 'status' })))).toEqual(['UDN-002', 'UDN-001', 'UDN-003', 'UDN-004']);
    expect(nos(applyTableQuery(rows, q({ scope: 'all', sort: 'outstanding', dir: 'desc' })))).toEqual([
      'UDN-001',
      'UDN-002',
      'UDN-003',
      'UDN-004',
    ]);
  });

  it('round-trips through URL params, omitting defaults', () => {
    expect(tableQueryToParams(q(), today).toString()).toBe('');
    const query = q({ scope: 'all', q: 'asha', status: ['Confirmed', 'Completed'], dmcIds: ['d1'], dmcPayment: 'due7', travelEnded: true, sort: 'commission', dir: 'desc' });
    expect(parseTableQuery(tableQueryToParams(query, today), today)).toEqual(query);
    expect(parseTableQuery(new URLSearchParams('status=Bogus,Pending&sort=x&month=2026-13'), today)).toMatchObject({
      status: ['Pending'],
      sort: 'travelStart',
      month: '2026-11',
    });
  });

  it('totals the footer under the counting rules', () => {
    expect(tableFooter(applyTableQuery(rows, q({ scope: 'all' })))).toEqual({
      count: 4,
      sellingPrice: 100_000 + 30_000 + 10_000,
      received: 40_000 + 30_000 + 25_000,
      outstanding: 60_000,
      refundsOwed: 15_000,
      commission: 20_000 + 10_000 + 8_000,
    });
  });
});

describe('overview', () => {
  it('computes month stats by travelStart month, excluding Pending', () => {
    expect(monthStats(rows, '2026-11')).toEqual({ bookings: 2, sellingPrice: 130_000, commission: 30_000, clientOutstanding: 60_000 });
    expect(monthStats(rows, '2026-12')).toEqual({ bookings: 0, sellingPrice: 10_000, commission: 8_000, clientOutstanding: 0 });
  });

  it('lists Needs attention categories in order, with details', () => {
    const cats = needsAttention({ rows, enquiries: [enquiry(), enquiry({ status: 'contacted' })], lastBackup: '2026-10-01', today });
    expect(cats.map((c) => [c.key, c.tone, c.count])).toEqual([
      ['clientOverdue', 'danger', 1],
      ['dmcDue', 'warn', 2],
      ['refunds', 'warn', 2],
      ['travelEnded', 'info', 1],
      ['newEnquiries', 'info', 1],
      ['backupOverdue', 'warn', 1],
    ]);
    expect(cats[0].items[0]).toEqual({ bookingId: 'b1', bookingNo: 'UDN-001', clientName: 'Asha Patel', detail: '₹60,000 overdue since 5 Nov 2026' });
    expect(cats[1].items.map((i) => i.detail)).toEqual(['Gulf Holidays ₹80,000 due 12 Nov 2026', 'Kerala Trails ₹15,000 overdue since 30 Oct 2026']);
    expect(cats[2].items.map((i) => i.detail)).toEqual(['Refund ₹15,000 to Client', 'Gulf Holidays due back ₹4,000']);
  });

  it('hides empty categories and a recent backup', () => {
    const cats = needsAttention({ rows: [], enquiries: [], lastBackup: '2026-10-11', today });
    expect(cats).toEqual([]);
    expect(needsAttention({ rows: [], enquiries: [], lastBackup: null, today })).toHaveLength(1);
  });
});

describe('insights', () => {
  it('uses FY / month presets and the previous equal period', () => {
    expect(insightsPeriod('thisFy', today)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(insightsPeriod('lastMonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(previousPeriod({ from: '2026-04-01', to: '2027-03-31' })).toEqual({ from: '2025-04-01', to: '2026-03-31' });
    expect(previousPeriod({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(previousPeriod({ from: '2026-11-05', to: '2026-11-14' })).toEqual({ from: '2026-10-26', to: '2026-11-04' });
  });

  const data = insights({
    rows,
    enquiries: [
      enquiry({ createdAt: new Date('2026-10-31T19:00:00Z'), status: 'converted' }), // 1 Nov IST
      enquiry({ createdAt: new Date('2026-11-02T05:00:00Z') }),
      enquiry({ createdAt: new Date('2026-10-05T05:00:00Z') }),
    ],
    period: insightsPeriod('thisFy', today),
    today,
  });

  it('computes KPIs under the counting rules', () => {
    expect(data.kpis).toEqual({
      bookings: 2,
      sellingPrice: 140_000,
      commission: 38_000,
      commissionPct: 38_000 / 140_000,
      averageSellingPrice: 65_000,
      cancellationRate: 1 / 3,
      pendingPipeline: { count: 1, sellingPrice: 60_000 },
    });
    expect(data.previousKpis.bookings).toBe(0);
  });

  it('builds month series on travelStart', () => {
    expect(data.byMonth).toHaveLength(12);
    expect(data.byMonth.find((m) => m.month === '2026-11')).toEqual({ month: '2026-11', sellingPrice: 130_000, commission: 30_000 });
    expect(data.byMonth.find((m) => m.month === '2026-12')).toEqual({ month: '2026-12', sellingPrice: 10_000, commission: 8_000 });
  });

  it('groups destinations case-insensitively and DMCs by Net Cost', () => {
    expect(data.commissionByDestination.map((d) => [d.label, d.amount])).toEqual([
      ['Dubai', 20_000],
      ['kerala', 10_000],
      ['Bali', 8_000],
    ]);
    expect(data.netCostByDmc.map((d) => [d.key, d.amount])).toEqual([
      ['d1', 82_000],
      ['d2', 20_000],
    ]);
    expect(data.byStatus.find((s) => s.status === 'Pending')?.count).toBe(1);
  });

  it('buckets Client outstanding ageing by days past due', () => {
    expect(data.clientAgeing.map((a) => [a.bucket, a.amount])).toEqual([
      ['notDue', 0],
      ['0-30', 60_000],
      ['31-60', 0],
      ['61-90', 0],
      ['90+', 0],
    ]);
  });

  it('counts Enquiry cohorts by IST createdAt month', () => {
    expect(data.enquiryFunnel.find((p) => p.month === '2026-11')).toEqual({ month: '2026-11', enquiries: 2, converted: 1, rate: 0.5 });
    expect(data.enquiryFunnel.find((p) => p.month === '2026-10')).toMatchObject({ enquiries: 1, converted: 0 });
    expect(enquiryFunnel([], ['2026-01'])).toEqual([{ month: '2026-01', enquiries: 0, converted: 0, rate: null }]);
  });

  it('schedules DMC payables by pay-by week after applying payments', () => {
    const p = dmcPayables(rows, today);
    expect(p).toHaveLength(9);
    expect(p[0]).toMatchObject({ key: 'overdue', amount: 15_000, byDmc: { d2: 15_000 } });
    expect(p[1]).toMatchObject({ from: '2026-11-10', to: '2026-11-16', amount: 80_000 });
  });

  it('allocates integer rupees by weight', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(10, [0, 0])).toEqual([5, 5]);
    expect(allocate(7, [3, 1])).toEqual([5, 2]);
  });

  it('builds top tables', () => {
    expect(data.topClients[0]).toMatchObject({ clientId: 'c1', bookings: 1, sellingPrice: 110_000, repeat: false });
    expect(data.topDmcs[0]).toMatchObject({ dmcId: 'd1', lines: 2, netCost: 82_000, paid: 6_000, outstanding: 76_000 });
  });
});

describe('directory summaries', () => {
  it('summarises a Client excluding Pending', () => {
    expect(clientSummary(rows, 'c2')).toEqual({ bookings: 1, billed: 30_000, outstanding: 0, refundsOwed: 0, usedIn: 2 });
  });

  it('summarises a DMC with signed outstanding and next pay-by', () => {
    const s = dmcSummary(rows, 'd1');
    expect(s).toMatchObject({ bookings: 1, netCost: 82_000, outstanding: 80_000 - 4_000, nextPayBy: '2026-11-12', usedIn: 2 });
    expect(s.rows.map((r) => [r.row.booking.bookingNo, r.cost, r.paid, r.outstanding])).toEqual([
      ['UDN-001', 80_000, 0, 80_000],
      ['UDN-004', 2_000, 6_000, -4_000],
    ]);
  });
});
