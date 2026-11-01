/** Seam 3: the admin data module against the Firestore emulator (with the real rules). */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { googleDb, seed, seedAdmins } from '../../test/adminAuth';
import { createRulesEnv, readAll } from '../../test/firestoreEmulator';
import { serialiseBackup } from '../export';
import type { BookingDraft, Booking } from '../model';
import {
  addClientPayment,
  addDmcPayment,
  AdminDataError,
  allocateInvoiceNo,
  cancelBooking,
  createBooking,
  createClient,
  createDmc,
  deleteClient,
  deleteClientPayment,
  deleteEnquiry,
  getBusinessProfile,
  readBackupCollections,
  saveBookingSection,
  saveBusinessProfile,
  saveEnquiryNotes,
  setEnquiryStatus,
  setPermissionDeniedHandler,
  setStatus,
  subscribeCollection,
  toAdminDataError,
  uncancelBooking,
  updateClient,
  updateClientPayment,
  type CollectionState,
} from '.';

let env: RulesTestEnvironment;
let db: Firestore;

beforeAll(async () => {
  env = await createRulesEnv('demo-udan-admin-data');
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
  db = googleDb(env);
});
afterEach(() => {
  setPermissionDeniedHandler(null);
});

const draft = (o: Partial<BookingDraft> = {}): BookingDraft => ({
  clientId: 'c1',
  destination: 'Dubai',
  travelStart: '2026-12-01',
  travelEnd: '2026-12-05',
  pax: { adults: 2, children: 1, infants: 0 },
  travellerNames: ['Asha Patel'],
  itinerary: 'Day 1: Arrive',
  internalNotes: '',
  sellingPrice: 150_000,
  lines: [
    { id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000, dmcPayBy: '2026-11-20' },
    { id: 'l2', type: 'Transfer', dmcId: 'd2', description: 'Airport transfers', netCost: 10_000, start: undefined },
  ],
  ...o,
});

async function readDoc(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore() as unknown as Firestore, path));
    data = snap.data();
  });
  return data;
}

const enquiryDoc = (o: Record<string, unknown> = {}) => ({
  name: 'Neha Shah',
  phone: '+919811111111',
  service: 'visa-services',
  message: 'Dubai visa',
  sourcePage: '/contact',
  destination: 'Dubai',
  status: 'new',
  createdAt: Timestamp.now(),
  ...o,
});

describe('createBooking', () => {
  it('allocates UDN-001, UDN-002 sequentially with status Pending and no payments', async () => {
    const a = await createBooking(db, draft());
    const b = await createBooking(db, draft({ destination: 'Bali' }));
    expect([a.bookingNo, b.bookingNo]).toEqual(['UDN-001', 'UDN-002']);
    expect([a.bookingSeq, b.bookingSeq]).toEqual([1, 2]);
    expect(await readDoc('counters/booking')).toEqual({ seq: 2 });
    const stored = await readDoc(`bookings/${a.id}`);
    expect(stored).toMatchObject({ bookingNo: 'UDN-001', status: 'Pending', clientPayments: [], dmcPayments: [], clientId: 'c1' });
    expect(stored?.createdAt).toBeInstanceOf(Timestamp);
    expect((stored?.lines as unknown[])[1]).toEqual({ id: 'l2', type: 'Transfer', dmcId: 'd2', description: 'Airport transfers', netCost: 10_000 });
  });

  it('creates Client + Booking + Enquiry update atomically', async () => {
    await seed(env, { 'inquiries/e1': enquiryDoc() });
    const r = await createBooking(db, draft({ clientId: undefined }), {
      newClient: { name: 'Neha Shah', mobile: '+919811111111', email: ' ', city: 'Surat' },
      enquiryId: 'e1',
    });
    expect(await readDoc(`clients/${r.clientId}`)).toMatchObject({ name: 'Neha Shah', mobile: '+919811111111', city: 'Surat' });
    expect(await readDoc(`clients/${r.clientId}`)).not.toHaveProperty('email');
    expect(await readDoc(`bookings/${r.id}`)).toMatchObject({ clientId: r.clientId, enquiryId: 'e1' });
    const enquiry = await readDoc('inquiries/e1');
    expect(enquiry).toMatchObject({ status: 'converted', clientId: r.clientId, bookingId: r.id });
    expect(enquiry?.convertedAt).toBeInstanceOf(Timestamp);
  });

  it('writes nothing when a rule rejects any part', async () => {
    await seed(env, { 'inquiries/e1': enquiryDoc() });
    const err = await createBooking(db, draft({ clientId: undefined }), {
      newClient: { name: 'Bad', mobile: '98110 11111' },
      enquiryId: 'e1',
    }).catch((e) => e);
    expect(err).toBeInstanceOf(AdminDataError);
    expect(err.code).toBe('permission-denied');
    expect(await readAll(env, 'bookings')).toEqual([]);
    expect(await readAll(env, 'clients')).toEqual([]);
    expect(await readDoc('counters/booking')).toBeUndefined();
    expect(await readDoc('inquiries/e1')).toMatchObject({ status: 'new' });
  });

  it('refuses to convert an Enquiry twice', async () => {
    await seed(env, { 'inquiries/e1': enquiryDoc({ status: 'converted', bookingId: 'b0' }) });
    await expect(createBooking(db, draft(), { enquiryId: 'e1' })).rejects.toMatchObject({ code: 'conflict' });
    expect(await readAll(env, 'bookings')).toEqual([]);
  });

  it('accepts same-day travel', async () => {
    await expect(createBooking(db, draft({ travelEnd: '2026-12-01' }))).resolves.toMatchObject({ bookingNo: 'UDN-001' });
  });
});

describe('allocateInvoiceNo', () => {
  it('gives UDAN/2026-27/001 and is idempotent', async () => {
    const { id } = await createBooking(db, draft());
    const first = await allocateInvoiceNo(db, id, { today: '2026-11-01' });
    expect(first).toEqual({ invoiceNo: 'UDAN/2026-27/001', invoiceSeq: 1, invoiceDate: '2026-11-01', allocated: true });
    const again = await allocateInvoiceNo(db, id, { today: '2026-11-15' });
    expect(again).toEqual({ ...first, allocated: false });
    expect(await readDoc('counters/invoice-2026-27')).toEqual({ seq: 1 });
    expect(await readDoc(`bookings/${id}`)).toMatchObject({ invoiceNo: 'UDAN/2026-27/001', invoiceDate: '2026-11-01' });
  });

  it('numbers within an FY and restarts at 001 in a new FY', async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push((await createBooking(db, draft())).id);
    expect((await allocateInvoiceNo(db, ids[0], { today: '2027-03-31' })).invoiceNo).toBe('UDAN/2026-27/001');
    expect((await allocateInvoiceNo(db, ids[1], { today: '2027-03-31' })).invoiceNo).toBe('UDAN/2026-27/002');
    expect((await allocateInvoiceNo(db, ids[2], { today: '2027-04-01' })).invoiceNo).toBe('UDAN/2027-28/001');
  });
});

describe('status, cancel and un-cancel', () => {
  it('sets status in one write', async () => {
    const { id } = await createBooking(db, draft());
    await setStatus(db, id, 'Voucher Received');
    expect(await readDoc(`bookings/${id}`)).toMatchObject({ status: 'Voucher Received' });
    await expect(setStatus(db, id, 'Cancelled' as never)).rejects.toThrow(/cancelBooking/);
  });

  it('cancel writes the reason, date and charges; un-cancel clears them and keeps refunds', async () => {
    const { id } = await createBooking(db, draft());
    await setStatus(db, id, 'Confirmed');
    await addClientPayment(db, id, { kind: 'Refund', date: '2026-11-02', amount: 1_000, mode: 'UPI' });
    await cancelBooking(db, id, { reason: ' Visa refused ', clientCancellationCharge: 20_000, lineCharges: { l1: 15_000 }, today: '2026-11-01' });
    const cancelled = (await readDoc(`bookings/${id}`)) as unknown as Booking;
    expect(cancelled).toMatchObject({ status: 'Cancelled', cancelledAt: '2026-11-01', cancelReason: 'Visa refused', clientCancellationCharge: 20_000 });
    expect(cancelled.lines.map((l) => l.dmcCancellationCharge)).toEqual([15_000, 0]);
    expect(cancelled.sellingPrice).toBe(150_000);

    await uncancelBooking(db, id, 'Confirmed');
    const restored = (await readDoc(`bookings/${id}`)) as unknown as Booking;
    expect(restored.status).toBe('Confirmed');
    for (const k of ['cancelledAt', 'cancelReason', 'clientCancellationCharge']) expect(restored).not.toHaveProperty(k);
    expect(restored.lines.every((l) => !('dmcCancellationCharge' in l))).toBe(true);
    expect(restored.clientPayments).toHaveLength(1);
  });

  it('un-cancels through the status select too', async () => {
    const { id } = await createBooking(db, draft());
    await cancelBooking(db, id, { reason: 'Changed plans' });
    await setStatus(db, id, 'Pending');
    expect(await readDoc(`bookings/${id}`)).not.toHaveProperty('cancelReason');
  });

  it('requires a reason', async () => {
    const { id } = await createBooking(db, draft());
    await expect(cancelBooking(db, id, { reason: ' ' })).rejects.toThrow(/reason/);
  });
});

describe('section saves and payments', () => {
  it('saves a section, removing a cleared optional field', async () => {
    const { id } = await createBooking(db, draft({ clientBalanceDueBy: '2026-11-25' }));
    await saveBookingSection(db, id, { sellingPrice: 160_000, clientBalanceDueBy: undefined });
    const b = await readDoc(`bookings/${id}`);
    expect(b).toMatchObject({ sellingPrice: 160_000 });
    expect(b).not.toHaveProperty('clientBalanceDueBy');
  });

  it('creates a new Client in the same write as the Client section', async () => {
    const { id } = await createBooking(db, draft());
    const { clientId } = await saveBookingSection(db, id, {}, { newClient: { name: 'Ravi', mobile: '+919812345678' } });
    expect(await readDoc(`bookings/${id}`)).toMatchObject({ clientId });
    expect(await readDoc(`clients/${clientId}`)).toMatchObject({ name: 'Ravi' });
  });

  it('adds, edits and deletes Client Payments', async () => {
    const { id } = await createBooking(db, draft());
    const pid = await addClientPayment(db, id, { kind: 'Payment', date: '2026-11-01', amount: 50_000, mode: 'UPI', ref: undefined });
    await addClientPayment(db, id, { kind: 'Payment', date: '2026-11-03', amount: 10_000, mode: 'Cash' });
    await updateClientPayment(db, id, { id: pid, kind: 'Payment', date: '2026-11-01', amount: 55_000, mode: 'UPI', ref: 'UTR1' });
    let b = (await readDoc(`bookings/${id}`)) as unknown as Booking;
    expect(b.clientPayments.map((p) => p.amount)).toEqual([55_000, 10_000]);
    expect(b.clientPayments[0].ref).toBe('UTR1');
    await deleteClientPayment(db, id, pid);
    b = (await readDoc(`bookings/${id}`)) as unknown as Booking;
    expect(b.clientPayments.map((p) => p.amount)).toEqual([10_000]);
  });

  it('only records DMC Payments for DMCs on the lines', async () => {
    const { id } = await createBooking(db, draft());
    await addDmcPayment(db, id, { dmcId: 'd1', kind: 'Payment', date: '2026-11-01', amount: 40_000, mode: 'Bank transfer' });
    await expect(
      addDmcPayment(db, id, { dmcId: 'd9', kind: 'Payment', date: '2026-11-01', amount: 1, mode: 'Cash' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(((await readDoc(`bookings/${id}`)) as unknown as Booking).dmcPayments).toHaveLength(1);
  });
});

describe('Clients, DMCs, Enquiries, Business profile', () => {
  it('creates, updates and deletes Clients and DMCs', async () => {
    const cid = await createClient(db, { name: ' Asha ', mobile: '+919876543210', city: 'Ahmedabad' });
    await updateClient(db, cid, { city: '', email: 'asha@example.com' });
    const c = await readDoc(`clients/${cid}`);
    expect(c).toMatchObject({ name: 'Asha', email: 'asha@example.com' });
    expect(c).not.toHaveProperty('city');
    await deleteClient(db, cid);
    expect(await readDoc(`clients/${cid}`)).toBeUndefined();
    const did = await createDmc(db, { name: 'Gulf Holidays', region: 'UAE', phone: '' });
    expect(await readDoc(`dmcs/${did}`)).toMatchObject({ name: 'Gulf Holidays', region: 'UAE' });
  });

  it('updates Enquiry status and notes; converted is final and undeletable', async () => {
    await seed(env, { 'inquiries/e1': enquiryDoc(), 'inquiries/e2': enquiryDoc({ status: 'converted', bookingId: 'b1' }) });
    await setEnquiryStatus(db, 'e1', 'closed', { closeReason: 'Spam' });
    expect(await readDoc('inquiries/e1')).toMatchObject({ status: 'closed', closeReason: 'Spam' });
    await setEnquiryStatus(db, 'e1', 'contacted');
    expect(await readDoc('inquiries/e1')).not.toHaveProperty('closeReason');
    await saveEnquiryNotes(db, 'e1', 'Call back Monday');
    expect(await readDoc('inquiries/e1')).toMatchObject({ adminNotes: 'Call back Monday' });

    const onDenied = vi.fn();
    setPermissionDeniedHandler(onDenied);
    await expect(setEnquiryStatus(db, 'e2', 'contacted')).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteEnquiry(db, 'e2')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(onDenied).toHaveBeenCalledTimes(2);
    await deleteEnquiry(db, 'e1');
    expect(await readDoc('inquiries/e1')).toBeUndefined();
  });

  it('seeds a missing Business profile once and saves edits', async () => {
    const seeded = await getBusinessProfile(db);
    expect(seeded).toMatchObject({ tradingName: 'UDAN Immigration & Tours', phones: '+91 96872 32015' });
    expect(seeded.address).toContain('Vastrapur');
    expect(seeded).not.toHaveProperty('email');
    expect(await readDoc('settings/business')).toMatchObject({ tradingName: 'UDAN Immigration & Tours' });

    await saveBusinessProfile(db, { ...seeded, upiId: ' udan@upi ', phones: '' });
    const saved = await getBusinessProfile(db);
    expect(saved).toMatchObject({ upiId: 'udan@upi', tradingName: 'UDAN Immigration & Tours' });
    expect(saved).not.toHaveProperty('phones');
    expect(saved.updatedAt).toBeInstanceOf(Date);
  });

  it('does not seed when asked not to', async () => {
    expect(await getBusinessProfile(db, { seed: false })).toEqual({});
    expect(await readDoc('settings/business')).toBeUndefined();
  });
});

describe('readBackupCollections', () => {
  it('reads all six collections (settings via settings/business) with Timestamps intact; serialises to the backup format', async () => {
    const at = Timestamp.fromDate(new Date('2026-11-01T04:30:00Z'));
    await seed(env, {
      'clients/c1': { name: 'Asha', mobile: '+919876543210', createdAt: at, updatedAt: at },
      'dmcs/d1': { name: 'Gulf Holidays', createdAt: at, updatedAt: at },
      'counters/booking': { seq: 3 },
      'settings/business': { tradingName: 'UDAN', updatedAt: at },
      'inquiries/e1': enquiryDoc({ createdAt: at }),
    });
    const raw = await readBackupCollections(db);
    expect(Object.keys(raw).sort()).toEqual(['bookings', 'clients', 'counters', 'dmcs', 'inquiries', 'settings']);
    expect(raw.bookings).toEqual({});
    expect(raw.counters).toEqual({ booking: { seq: 3 } });
    expect(raw.settings.business.tradingName).toBe('UDAN');
    const backup = serialiseBackup({ projectId: 'demo', exportedAt: new Date('2026-11-01T05:00:00Z'), collections: raw });
    expect(backup.collections.clients.c1.createdAt).toBe('2026-11-01T04:30:00.000Z');
    expect(backup.collections.inquiries.e1).toMatchObject({ name: 'Neha Shah', createdAt: '2026-11-01T04:30:00.000Z' });
  });

  it('reads settings as empty when the Business profile was never saved', async () => {
    expect((await readBackupCollections(db)).settings).toEqual({});
  });
});

describe('subscribeCollection', () => {
  function collect<T>(db: Firestore, name: Parameters<typeof subscribeCollection>[1]) {
    const states: CollectionState<T>[] = [];
    const unsubscribe = subscribeCollection(db, name, (s) => states.push(s as CollectionState<T>));
    const until = (pred: (s: CollectionState<T>) => boolean) =>
      vi.waitFor(() => {
        const s = states.at(-1);
        if (!s || !pred(s)) throw new Error('not yet');
        return s;
      }, { timeout: 5_000 });
    return { states, unsubscribe, until };
  }

  it('streams live, sorted data', async () => {
    const sub = collect<Booking>(db, 'bookings');
    expect(sub.states[0].status).toBe('loading');
    await sub.until((s) => s.status === 'ready');
    await createBooking(db, draft());
    await createBooking(db, draft());
    const s = await sub.until((s) => s.data.length === 2);
    expect(s.data.map((b) => b.bookingNo)).toEqual(['UDN-001', 'UDN-002']);
    expect(s.data[0].createdAt).toBeInstanceOf(Date);
    sub.unsubscribe();
  });

  it('reports permission-denied for a non-admin', async () => {
    const onDenied = vi.fn();
    setPermissionDeniedHandler(onDenied);
    const sub = collect(googleDb(env, { email: 'stranger@example.com' }), 'clients');
    const s = await sub.until((s) => s.status === 'error');
    expect(s.error?.code).toBe('permission-denied');
    expect(onDenied).toHaveBeenCalled();
    sub.unsubscribe();
  });
});

describe('error mapping', () => {
  it.each([
    ['permission-denied', 'permission-denied'],
    ['unavailable', 'network'],
    ['deadline-exceeded', 'network'],
    ['aborted', 'conflict'],
    ['failed-precondition', 'conflict'],
    ['internal', 'unknown'],
  ])('%s → %s', (code, mapped) => {
    expect(toAdminDataError(Object.assign(new Error('x'), { code })).code).toBe(mapped);
  });

  it('maps plain errors to unknown and keeps AdminDataErrors', () => {
    expect(toAdminDataError(new Error('boom')).code).toBe('unknown');
    const e = new AdminDataError('conflict');
    expect(toAdminDataError(e)).toBe(e);
  });
});

