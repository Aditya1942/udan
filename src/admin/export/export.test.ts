/** Seam 4: export units — toCsv, Payments Ledger rows, directory/bookings CSV, Backup serialiser. */
import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { buildBookingRows } from '../model';
import { booking, clients, dmcPay, dmcs, line, pay, refund } from '../model/testFixtures';
import {
  BACKUP_COLLECTIONS,
  backupFilename,
  backupJson,
  bookingsCsv,
  clientCsvRows,
  clientsCsv,
  csvCell,
  dmcCsvRows,
  dmcsCsv,
  ledgerCsv,
  ledgerFilename,
  ledgerPeriod,
  ledgerRows,
  serialiseBackup,
  toCsv,
} from '.';

const BOM = '﻿';
const clientsById = new Map(clients.map((c) => [c.id, c]));
const dmcsById = new Map(dmcs.map((d) => [d.id, d]));
/** CSV text → lines without BOM and the trailing CRLF. */
const lines = (csv: string) => csv.slice(1).split('\r\n').slice(0, -1);

describe('toCsv', () => {
  it('starts with a BOM and ends every record with CRLF', () => {
    const csv = toCsv(['A', 'B'], [['x', 1], ['y', 2]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toBe(`${BOM}A,B\r\nx,1\r\ny,2\r\n`);
  });

  it('quotes commas, quotes and line breaks (RFC 4180)', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(null)).toBe('');
  });

  it('guards text cells against formula injection', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+91 98')).toBe("'+91 98");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('\tx')).toBe("'\tx");
    expect(csvCell('\rx')).toBe("\"'\rx\"");
    expect(csvCell('=a,b')).toBe(`"'=a,b"`);
  });

  it('writes numbers as plain integers (negative stays numeric)', () => {
    expect(csvCell(148500)).toBe('148500');
    expect(csvCell(-2000)).toBe('-2000');
    expect(csvCell(Number.NaN)).toBe('');
  });
});

describe('Payments Ledger', () => {
  const b1 = booking({
    bookingSeq: 1,
    clientId: 'c1',
    lines: [line({ dmcId: 'd1', netCost: 50_000 })],
    clientPayments: [pay(30_000, { date: '2026-05-10', ref: 'UTR1' }), refund(5_000, { date: '2026-06-01', mode: 'Cash' })],
    dmcPayments: [dmcPay('d1', 20_000, { date: '2026-05-10' }), dmcPay('d1', 1_000, { date: '2026-07-01', kind: 'Refund' })],
  });
  const b2 = booking({
    bookingSeq: 2,
    clientId: 'c2',
    status: 'Cancelled',
    clientPayments: [pay(10_000, { date: '2026-05-10', note: '=evil' })],
    dmcPayments: [],
  });
  const old = booking({ bookingSeq: 3, clientPayments: [pay(7_000, { date: '2026-03-31' })] });
  const all = [b2, old, b1];
  const fy = { from: '2026-04-01', to: '2027-03-31' };

  it('signs per side and kind: Customer payment +, Customer refund −, DMC payment −, DMC refund +', () => {
    const rows = ledgerRows(all, clientsById, dmcsById, { ...fy, side: 'both' });
    const signed = rows.map((r) => [r.bookingNo, r.side, r.kind, r.amount, r.signedAmount]);
    expect(signed).toEqual([
      ['UDN-001', 'Customer', 'Payment', 30_000, 30_000],
      ['UDN-001', 'DMC', 'Payment', 20_000, -20_000],
      ['UDN-002', 'Customer', 'Payment', 10_000, 10_000],
      ['UDN-001', 'Customer', 'Refund', 5_000, -5_000],
      ['UDN-001', 'DMC', 'Refund', 1_000, 1_000],
    ]);
  });

  it('sorts by date, then Booking ID; includes Cancelled; filters by date range (inclusive)', () => {
    const rows = ledgerRows(all, clientsById, dmcsById, { from: '2026-03-31', to: '2026-05-10', side: 'both' });
    expect(rows.map((r) => `${r.date} ${r.bookingNo} ${r.bookingStatus}`)).toEqual([
      '2026-03-31 UDN-003 Confirmed',
      '2026-05-10 UDN-001 Confirmed',
      '2026-05-10 UDN-001 Confirmed',
      '2026-05-10 UDN-002 Cancelled',
    ]);
  });

  it('filters by side and names the party', () => {
    const client = ledgerRows(all, clientsById, dmcsById, { ...fy, side: 'client' });
    expect(client.every((r) => r.side === 'Customer')).toBe(true);
    expect(client.map((r) => r.party)).toEqual(['Asha Patel', 'Ravi Mehta', 'Asha Patel']);
    const dmc = ledgerRows(all, clientsById, dmcsById, { ...fy, side: 'dmc' });
    expect(dmc.map((r) => `${r.party} ${r.signedAmount}`)).toEqual(['Gulf Holidays -20000', 'Gulf Holidays 1000']);
  });

  it('writes the CSV columns in order with signed amounts as numbers and guarded notes', () => {
    const csv = ledgerCsv(ledgerRows(all, clientsById, dmcsById, { from: '2026-05-10', to: '2026-05-10', side: 'both' }));
    expect(lines(csv)).toEqual([
      'Date,Booking ID,Booking status,Side,Party,Kind,Mode,Reference,Note,Amount,Signed amount',
      '2026-05-10,UDN-001,Confirmed,Customer,Asha Patel,Payment,UPI,UTR1,,30000,30000',
      '2026-05-10,UDN-001,Confirmed,DMC,Gulf Holidays,Payment,UPI,,,20000,-20000',
      "2026-05-10,UDN-002,Cancelled,Customer,Ravi Mehta,Payment,UPI,,'=evil,10000,10000",
    ]);
  });

  it('periods and filename', () => {
    expect(ledgerPeriod('thisFy', '2026-11-01')).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(ledgerPeriod('lastFy', '2026-11-01')).toEqual({ from: '2025-04-01', to: '2026-03-31' });
    expect(ledgerPeriod('thisMonth', '2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(ledgerFilename({ from: '2026-04-01', to: '2027-03-31' })).toBe('udan-payments-2026-04-01-2027-03-31.csv');
  });
});

describe('Customers / DMCs / Bookings CSV', () => {
  const rows = buildBookingRows(
    [
      booking({ bookingSeq: 1, clientId: 'c1', sellingPrice: 100_000, lines: [line({ dmcId: 'd1', netCost: 80_000 })] }),
      booking({ bookingSeq: 2, clientId: 'c1', status: 'Pending', lines: [line({ dmcId: 'd1' })] }),
    ],
    clients,
    dmcs,
    '2026-11-01',
  );

  it('Customers: every field + Bookings count (Pending excluded); dates IST', () => {
    const withDates = [{ ...clients[0], notes: 'VIP, "gold"', createdAt: new Date('2026-10-31T20:00:00Z') }, clients[1]];
    expect(lines(clientsCsv(clientCsvRows(withDates, rows)))).toEqual([
      'Customer ID,Name,Mobile,WhatsApp,Email,Address,City,State,Country,Emergency contact name,Emergency contact phone,GST number,PAN number,Notes,Bookings,Created,Updated',
      'c1,Asha Patel,\'+919876543210,,asha@example.com,,Ahmedabad,,,,,,,"VIP, ""gold""",1,2026-11-01,',
      "c2,Ravi Mehta,'+919812345678,,,,,,,,,,,,0,,",
    ]);
  });

  it('DMCs: every field + Bookings count', () => {
    expect(lines(dmcsCsv(dmcCsvRows(dmcs, rows)))).toEqual([
      'DMC ID,Name,Contact person,Phone,Email,Region,Notes,Bookings,Created,Updated',
      'd1,Gulf Holidays,,,,,,1,,',
      'd2,Kerala Trails,,,,,,0,,',
    ]);
  });

  it('Bookings table rows keep the given order and the table columns', () => {
    const [header, first] = lines(bookingsCsv(rows));
    expect(header.split(',').slice(0, 4)).toEqual(['Booking ID', 'Customer', 'Mobile', 'Destination']);
    expect(first.startsWith("UDN-001,Asha Patel,'+919876543210,Dubai,2026-11-10,2026-11-15,,2,Confirmed,100000,0,100000,20000")).toBe(true);
  });
});

describe('Backup serialiser', () => {
  const ts = Timestamp.fromDate(new Date('2026-11-01T04:30:00.000Z'));
  const input = {
    projectId: 'udan-prod',
    exportedAt: new Date('2026-11-01T05:00:00.000Z'),
    collections: {
      clients: { c1: { name: 'Asha', createdAt: ts, updatedAt: ts } },
      bookings: { b1: { bookingNo: 'UDN-001', lines: [{ id: 'l1', netCost: 5 }], createdAt: ts } },
      settings: { business: { signature: 'data:image/png;base64,AAAA', updatedAt: ts } },
      inquiries: { e1: { status: 'converted', convertedAt: ts, createdAt: ts } },
      counters: { booking: { seq: 1 } },
    },
  };

  it('has format, version, exportedAt, projectId and all 6 collections (empty ones too)', () => {
    const b = serialiseBackup(input);
    expect(b.format).toBe('udan-admin-backup');
    expect(b.version).toBe(1);
    expect(b.exportedAt).toBe('2026-11-01T05:00:00.000Z');
    expect(b.projectId).toBe('udan-prod');
    expect(Object.keys(b.collections).sort()).toEqual([...BACKUP_COLLECTIONS].sort());
    expect(b.collections.dmcs).toEqual({});
  });

  it('turns Timestamps into ISO strings and keeps everything else as-is', () => {
    const b = serialiseBackup(input);
    expect(b.collections.clients.c1).toEqual({ name: 'Asha', createdAt: '2026-11-01T04:30:00.000Z', updatedAt: '2026-11-01T04:30:00.000Z' });
    expect(b.collections.inquiries.e1.convertedAt).toBe('2026-11-01T04:30:00.000Z');
    expect(b.collections.bookings.b1.lines).toEqual([{ id: 'l1', netCost: 5 }]);
    expect(b.collections.settings.business.signature).toBe('data:image/png;base64,AAAA');
    expect(b.collections.counters.booking).toEqual({ seq: 1 });
  });

  it('pretty-prints JSON that round-trips; filename uses the IST date', () => {
    const text = backupJson(input);
    expect(text).toContain('\n  "format": "udan-admin-backup"');
    expect(JSON.parse(text)).toEqual(serialiseBackup(input));
    expect(backupFilename('2026-11-01')).toBe('udan-backup-2026-11-01.json');
  });
});
