/**
 * Seam 2: Firestore rules for the admin collections and admin ops on `inquiries`, against the emulator.
 * Public enquiry create cases live in inquiries.test.ts.
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { ADMIN_EMAIL, googleDb, seed, seedAdmins } from '../adminAuth';
import { contextDb, createRulesEnv } from '../firestoreEmulator';

let env: RulesTestEnvironment;
let admin: Firestore;

beforeAll(async () => {
  env = await createRulesEnv('demo-udan-admin-rules');
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
  admin = googleDb(env);
});

const now = serverTimestamp;
const past = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));

function client(o: Record<string, unknown> = {}) {
  return { name: 'Asha Patel', mobile: '+919876543210', email: 'a@example.com', createdAt: now(), updatedAt: now(), ...o };
}
function dmc(o: Record<string, unknown> = {}) {
  return { name: 'Gulf Holidays', region: 'UAE', createdAt: now(), updatedAt: now(), ...o };
}
function booking(o: Record<string, unknown> = {}) {
  return {
    bookingNo: 'UDN-001',
    bookingSeq: 1,
    clientId: 'c1',
    status: 'Pending',
    destination: 'Dubai',
    travelStart: '2026-12-01',
    travelEnd: '2026-12-05',
    pax: { adults: 2, children: 0, infants: 0 },
    travellerNames: [],
    itinerary: '',
    internalNotes: '',
    sellingPrice: 100000,
    lines: [{ id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Hotel', netCost: 80000 }],
    clientPayments: [],
    dmcPayments: [],
    createdAt: now(),
    updatedAt: now(),
    ...o,
  };
}
const seeded = (data: Record<string, unknown>) => ({ ...data, createdAt: past, updatedAt: past });

const ADMIN_PATHS = ['clients/c1', 'dmcs/d1', 'bookings/b1', 'counters/booking', 'settings/business'];

describe('auth: who is an Admin', () => {
  beforeEach(() => seed(env, { 'clients/c1': seeded(client()) }));

  it('allows a listed Google account', async () => {
    await assertSucceeds(getDoc(doc(admin, 'clients/c1')));
  });

  it('matches a mixed-case email', async () => {
    await assertSucceeds(getDoc(doc(googleDb(env, { email: 'Owner@Example.COM' }), 'clients/c1')));
  });

  it('denies an email not on the list', async () => {
    await assertFails(getDoc(doc(googleDb(env, { email: 'stranger@example.com' }), 'clients/c1')));
  });

  it('denies an unverified email', async () => {
    await assertFails(getDoc(doc(googleDb(env, { email_verified: false }), 'clients/c1')));
  });

  it('denies a listed email signed in with a password', async () => {
    await assertFails(getDoc(doc(googleDb(env, { provider: 'password' }), 'clients/c1')));
  });

  it('denies everyone when config/admins is missing', async () => {
    await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(contextDb(ctx), 'config/admins')));
    await assertFails(getDoc(doc(admin, 'clients/c1')));
  });

  it.each(ADMIN_PATHS)('denies unauthenticated and non-admin read/write on %s', async (path) => {
    for (const db of [contextDb(env.unauthenticatedContext()), googleDb(env, { email: 'stranger@example.com' })]) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(getDocs(collection(db, path.split('/')[0])));
      await assertFails(setDoc(doc(db, path), { seq: 1 }));
      await assertFails(deleteDoc(doc(db, path)));
    }
  });

  it('denies unauthenticated admin ops on inquiries', async () => {
    await seed(env, { 'inquiries/e1': { name: 'X', status: 'new', createdAt: past } });
    const anon = contextDb(env.unauthenticatedContext());
    await assertFails(getDoc(doc(anon, 'inquiries/e1')));
    await assertFails(updateDoc(doc(anon, 'inquiries/e1'), { status: 'contacted', updatedAt: now() }));
    await assertFails(deleteDoc(doc(anon, 'inquiries/e1')));
  });
});

describe('config', () => {
  it('lets an Admin read config/admins', async () => {
    await assertSucceeds(getDoc(doc(admin, 'config/admins')));
  });

  it('denies any write to config/admins, even by an Admin', async () => {
    await assertFails(setDoc(doc(admin, 'config/admins'), { emails: [ADMIN_EMAIL, 'new@example.com'] }));
    await assertFails(updateDoc(doc(admin, 'config/admins'), { emails: [] }));
    await assertFails(deleteDoc(doc(admin, 'config/admins')));
  });

  it('denies other config ids', async () => {
    await assertFails(getDoc(doc(admin, 'config/other')));
    await assertFails(setDoc(doc(admin, 'config/other'), { a: 1 }));
  });
});

describe('clients and dmcs', () => {
  it('allows create, read, update and delete of valid docs', async () => {
    await assertSucceeds(setDoc(doc(admin, 'clients/c1'), client()));
    await assertSucceeds(getDoc(doc(admin, 'clients/c1')));
    await assertSucceeds(updateDoc(doc(admin, 'clients/c1'), { city: 'Ahmedabad', updatedAt: now() }));
    await assertSucceeds(
      updateDoc(doc(admin, 'clients/c1'), {
        whatsappSameAsMobile: true,
        address: '12 Park Road',
        state: 'Gujarat',
        country: 'India',
        emergencyName: 'Ravi',
        emergencyPhone: '+919800000000',
        gstin: '24ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        updatedAt: now(),
      }),
    );
    await assertSucceeds(updateDoc(doc(admin, 'clients/c1'), { whatsappSameAsMobile: deleteField(), whatsapp: '+919811111111', updatedAt: now() }));
    await assertSucceeds(deleteDoc(doc(admin, 'clients/c1')));
    await assertSucceeds(setDoc(doc(admin, 'dmcs/d1'), dmc()));
    await assertSucceeds(updateDoc(doc(admin, 'dmcs/d1'), { notes: 'Pays late', updatedAt: now() }));
    await assertSucceeds(getDocs(collection(admin, 'dmcs')));
    await assertSucceeds(deleteDoc(doc(admin, 'dmcs/d1')));
  });

  it.each([
    ['an unknown key', { passport: 'X123' }],
    ['a wrong type', { city: 42 }],
    ['a non-boolean whatsappSameAsMobile', { whatsappSameAsMobile: 'yes' }],
    ['a non-string GST number', { gstin: 24 }],
    ['a non-E.164 mobile', { mobile: '98765 43210' }],
    ['an empty name', { name: '' }],
    ['a client-supplied createdAt', { createdAt: past }],
    ['a client-supplied updatedAt', { updatedAt: past }],
  ])('rejects a Client with %s', async (_label, o) => {
    await assertFails(setDoc(doc(admin, 'clients/c1'), client(o)));
  });

  it('rejects a DMC with bank details or no name', async () => {
    await assertFails(setDoc(doc(admin, 'dmcs/d1'), dmc({ accountNumber: '123' })));
    const { name: _omit, ...nameless } = dmc();
    await assertFails(setDoc(doc(admin, 'dmcs/d1'), nameless));
  });

  it('requires updatedAt == request.time and keeps createdAt on update', async () => {
    await seed(env, { 'clients/c1': seeded(client()) });
    await assertFails(updateDoc(doc(admin, 'clients/c1'), { city: 'Surat' }));
    await assertFails(updateDoc(doc(admin, 'clients/c1'), { city: 'Surat', updatedAt: past }));
    await assertFails(updateDoc(doc(admin, 'clients/c1'), { createdAt: now(), updatedAt: now() }));
  });
});

describe('bookings', () => {
  it('allows create, read and update of a valid Booking', async () => {
    await assertSucceeds(setDoc(doc(admin, 'bookings/b1'), booking({ clientBalanceDueBy: '2026-11-20', enquiryId: 'e1' })));
    await assertSucceeds(getDoc(doc(admin, 'bookings/b1')));
    await assertSucceeds(updateDoc(doc(admin, 'bookings/b1'), { status: 'Confirmed', updatedAt: now() }));
  });

  it('allows a legacy Booking (no category, no hasTravel)', async () => {
    await assertSucceeds(setDoc(doc(admin, 'bookings/b1'), booking()));
  });

  it('allows a Visa Booking without Travel', async () => {
    const data = booking({
      category: 'Visa',
      hasTravel: false,
      destination: undefined,
      travelStart: undefined,
      travelEnd: undefined,
      lines: [{ id: 'l1', type: 'Visa', description: 'UAE visa', netCost: 0, visaType: 'Visitor', visaCountry: 'UAE' }],
    });
    for (const [k, v] of Object.entries(data)) if (v === undefined) delete (data as Record<string, unknown>)[k];
    await assertSucceeds(setDoc(doc(admin, 'bookings/b1'), data));
  });

  it.each([
    ['an unknown key', { totalPaid: 0 }],
    ['a bad category', { category: 'Cruise' }],
    ['a bad trip scope', { tripScope: 'Local' }],
    ['Travel on without dates', { hasTravel: true, travelStart: undefined }],
    ['negative money', { sellingPrice: -1 }],
    ['fractional money', { sellingPrice: 10.5 }],
    ['a bad status', { status: 'Booked' }],
    ['a bad date format', { travelStart: '01/12/2026' }],
    ['travelEnd before travelStart', { travelEnd: '2026-11-30' }],
    ['a bad Booking ID', { bookingNo: 'UDN-1' }],
    ['a wrong type for lines', { lines: 'none' }],
    ['a bad pax', { pax: { adults: -1, children: 0, infants: 0 } }],
    ['a negative cancellation charge', { clientCancellationCharge: -5 }],
    ['a missing required key', { destination: undefined }],
    ['a stale updatedAt', { updatedAt: past }],
  ])('rejects %s', async (_label, o) => {
    const data = booking(o);
    for (const [k, v] of Object.entries(data)) if (v === undefined) delete (data as Record<string, unknown>)[k];
    await assertFails(setDoc(doc(admin, 'bookings/b1'), data));
  });

  describe('existing Booking', () => {
    beforeEach(() => seed(env, { 'bookings/b1': seeded(booking()) }));
    const update = (o: Record<string, unknown>) => updateDoc(doc(admin, 'bookings/b1'), { ...o, updatedAt: now() });

    it('denies delete', async () => {
      await assertFails(deleteDoc(doc(admin, 'bookings/b1')));
    });

    it('keeps bookingNo, bookingSeq and createdAt immutable', async () => {
      await assertFails(update({ bookingNo: 'UDN-002' }));
      await assertFails(update({ bookingSeq: 2 }));
      await assertFails(update({ createdAt: now() }));
    });

    it('requires updatedAt == request.time', async () => {
      await assertFails(updateDoc(doc(admin, 'bookings/b1'), { status: 'Confirmed' }));
    });

    it('sets invoice fields once; change or removal is denied', async () => {
      await assertSucceeds(update({ invoiceNo: 'UDAN/2026-27/001', invoiceSeq: 1, invoiceDate: '2026-11-01' }));
      await assertSucceeds(update({ sellingPrice: 120000 }));
      await assertFails(update({ invoiceNo: 'UDAN/2026-27/002' }));
      await assertFails(update({ invoiceSeq: 2 }));
      await assertFails(update({ invoiceDate: '2026-11-02' }));
      await assertFails(update({ invoiceNo: deleteField() }));
    });

    it('rejects a malformed invoice number', async () => {
      await assertFails(update({ invoiceNo: 'INV-1', invoiceSeq: 1, invoiceDate: '2026-11-01' }));
    });

    it('sets enquiryId once', async () => {
      await assertSucceeds(update({ enquiryId: 'e1' }));
      await assertFails(update({ enquiryId: 'e2' }));
      await assertFails(update({ enquiryId: deleteField() }));
    });

    it('allows cancel and un-cancel fields', async () => {
      await assertSucceeds(update({ status: 'Cancelled', cancelledAt: '2026-11-01', cancelReason: 'Visa refused', clientCancellationCharge: 5000 }));
      await assertSucceeds(update({ status: 'Confirmed', cancelledAt: deleteField(), cancelReason: deleteField(), clientCancellationCharge: deleteField() }));
    });
  });
});

describe('counters', () => {
  it('allows create at 1 and +1 updates', async () => {
    await assertSucceeds(setDoc(doc(admin, 'counters/booking'), { seq: 1 }));
    await assertSucceeds(setDoc(doc(admin, 'counters/booking'), { seq: 2 }));
    await assertSucceeds(setDoc(doc(admin, 'counters/invoice-2026-27'), { seq: 1 }));
    await assertSucceeds(getDoc(doc(admin, 'counters/booking')));
  });

  it('denies create at another value', async () => {
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 0 }));
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 5 }));
  });

  it('denies +2, decrement, extra keys and delete', async () => {
    await seed(env, { 'counters/booking': { seq: 3 } });
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 5 }));
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 2 }));
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 4, note: 'x' }));
    await assertFails(setDoc(doc(admin, 'counters/booking'), { seq: 4.5 }));
    await assertFails(deleteDoc(doc(admin, 'counters/booking')));
  });

  it.each(['bookings', 'invoice-2026', 'invoice-26-27', 'other'])('denies counter id %s', async (id) => {
    await assertFails(setDoc(doc(admin, 'counters', id), { seq: 1 }));
  });
});

describe('settings', () => {
  const png = (size: number) => 'data:image/png;base64,'.padEnd(size, 'A');

  it('allows a valid Business profile, including a signature at the limit', async () => {
    await assertSucceeds(setDoc(doc(admin, 'settings/business'), { tradingName: 'UDAN', upiId: 'udan@upi', updatedAt: now() }));
    await assertSucceeds(setDoc(doc(admin, 'settings/business'), { signature: png(140_000), updatedAt: now() }));
    await assertSucceeds(getDoc(doc(admin, 'settings/business')));
  });

  it('denies an oversize or non-PNG signature', async () => {
    await assertFails(setDoc(doc(admin, 'settings/business'), { signature: png(140_001), updatedAt: now() }));
    await assertFails(setDoc(doc(admin, 'settings/business'), { signature: 'data:image/jpeg;base64,AAAA', updatedAt: now() }));
  });

  it('denies unknown keys, non-strings, missing updatedAt and delete', async () => {
    await assertFails(setDoc(doc(admin, 'settings/business'), { gstin: 'X', updatedAt: now() }));
    await assertFails(setDoc(doc(admin, 'settings/business'), { phones: 123, updatedAt: now() }));
    await assertFails(setDoc(doc(admin, 'settings/business'), { tradingName: 'UDAN' }));
    await seed(env, { 'settings/business': { tradingName: 'UDAN', updatedAt: past } });
    await assertFails(deleteDoc(doc(admin, 'settings/business')));
  });

  it('denies other settings ids', async () => {
    await assertFails(setDoc(doc(admin, 'settings/other'), { tradingName: 'UDAN', updatedAt: now() }));
    await assertFails(getDoc(doc(admin, 'settings/other')));
  });
});

describe('settings/documents', () => {
  const valid = (o: Record<string, unknown> = {}) => ({
    defaults: { invoice: 'reference', voucher: 'ticket' },
    messages: { invoiceWhatsapp: 'Hi {name}, {link}' },
    updatedAt: now(),
    ...o,
  });

  it('allows Admins to read and write valid Document settings', async () => {
    await assertSucceeds(setDoc(doc(admin, 'settings/documents'), valid()));
    await assertSucceeds(setDoc(doc(admin, 'settings/documents'), valid({ defaults: {}, messages: {} })));
    await assertSucceeds(getDoc(doc(admin, 'settings/documents')));
  });

  it('denies unknown kinds/keys, bad template ids, oversize messages and non-Admins', async () => {
    await assertFails(setDoc(doc(admin, 'settings/documents'), valid({ defaults: { receipt: 'band' } })));
    await assertFails(setDoc(doc(admin, 'settings/documents'), valid({ defaults: { invoice: 'Bad Id!' } })));
    await assertFails(setDoc(doc(admin, 'settings/documents'), valid({ messages: { sms: 'x' } })));
    await assertFails(setDoc(doc(admin, 'settings/documents'), valid({ messages: { invoiceEmail: 'x'.repeat(2001) } })));
    await assertFails(setDoc(doc(admin, 'settings/documents'), valid({ extra: 1 })));
    await assertFails(setDoc(doc(admin, 'settings/documents'), { defaults: {}, messages: {} }));
    const anon = contextDb(env.unauthenticatedContext());
    await assertFails(getDoc(doc(anon, 'settings/documents')));
    await assertFails(setDoc(doc(anon, 'settings/documents'), valid()));
  });
});

describe('shares', () => {
  const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';
  const share = (o: Record<string, unknown> = {}) => ({
    kind: 'invoice',
    bookingId: 'b1',
    family: 'reference',
    active: true,
    issuedOn: '2026-11-08',
    v: 1,
    title: 'Invoice UDAN/2026-27/001',
    filename: 'UDAN-Invoice-UDAN_2026-27_001.pdf',
    tradingName: 'UDAN',
    phone: '+91 96872 32015',
    view: '{"invoiceNo":"UDAN/2026-27/001"}',
    unavailable: '',
    createdAt: now(),
    updatedAt: now(),
    ...o,
  });

  it('lets anyone get one link by token, but only Admins list', async () => {
    await seed(env, { [`shares/${TOKEN}`]: { ...share(), createdAt: past, updatedAt: past } });
    const anon = contextDb(env.unauthenticatedContext());
    await assertSucceeds(getDoc(doc(anon, 'shares', TOKEN)));
    await assertFails(getDocs(collection(anon, 'shares')));
    await assertSucceeds(getDocs(collection(admin, 'shares')));
  });

  it('allows Admins to create, sync and disable a link; denies the public any write', async () => {
    await assertSucceeds(setDoc(doc(admin, 'shares', TOKEN), share()));
    await assertSucceeds(updateDoc(doc(admin, 'shares', TOKEN), { view: '{}', family: 'band', updatedAt: now() }));
    await assertSucceeds(updateDoc(doc(admin, 'shares', TOKEN), { active: false, view: '', updatedAt: now() }));
    const anon = contextDb(env.unauthenticatedContext());
    await assertFails(setDoc(doc(anon, 'shares', 'ZyXwVuTsRqPoNmLkJiHgFe'), share()));
    await assertFails(updateDoc(doc(anon, 'shares', TOKEN), { view: '{}' }));
  });

  it('keeps a disabled link disabled and its identity fixed', async () => {
    await seed(env, { [`shares/${TOKEN}`]: { ...share({ active: false, view: '' }), createdAt: past, updatedAt: past } });
    await assertFails(updateDoc(doc(admin, 'shares', TOKEN), { active: true, updatedAt: now() }));
    await seed(env, { [`shares/${TOKEN}`]: { ...share(), createdAt: past, updatedAt: past } });
    await assertFails(updateDoc(doc(admin, 'shares', TOKEN), { bookingId: 'b2', updatedAt: now() }));
    await assertFails(updateDoc(doc(admin, 'shares', TOKEN), { kind: 'voucher', updatedAt: now() }));
    await assertFails(deleteDoc(doc(admin, 'shares', TOKEN)));
  });

  it('denies short tokens, unknown keys, bad kinds and inactive creates', async () => {
    await assertFails(setDoc(doc(admin, 'shares', 'short'), share()));
    await assertFails(setDoc(doc(admin, 'shares', TOKEN), share({ netCost: 1 })));
    await assertFails(setDoc(doc(admin, 'shares', TOKEN), share({ kind: 'admin' })));
    await assertFails(setDoc(doc(admin, 'shares', TOKEN), share({ active: false })));
    await assertFails(setDoc(doc(admin, 'shares', TOKEN), share({ unavailable: 'x' })));
  });
});

describe('inquiries: admin', () => {
  const enquiry = (o: Record<string, unknown> = {}) => ({
    name: 'Neha Shah',
    phone: '+919811111111',
    service: 'visa-services',
    message: '',
    sourcePage: '/',
    destination: null,
    status: 'new',
    createdAt: past,
    ...o,
  });
  beforeEach(() => seed(env, { 'inquiries/e1': enquiry(), 'inquiries/e2': enquiry({ status: 'converted', bookingId: 'b1' }) }));
  const update = (id: string, o: Record<string, unknown>) => updateDoc(doc(admin, 'inquiries', id), { ...o, updatedAt: now() });

  it('lets an Admin read and list', async () => {
    await assertSucceeds(getDocs(collection(admin, 'inquiries')));
  });

  it('allows status, notes and close reason updates', async () => {
    await assertSucceeds(update('e1', { status: 'contacted', adminNotes: 'Called' }));
    await assertSucceeds(update('e1', { status: 'closed', closeReason: 'Spam' }));
    await assertSucceeds(update('e1', { status: 'contacted', closeReason: deleteField() }));
    await assertSucceeds(update('e2', { adminNotes: 'Booked' }));
  });

  it('limits updates to the admin keys', async () => {
    await assertFails(update('e1', { name: 'Changed' }));
    await assertFails(update('e1', { phone: '+919800000000' }));
    await assertFails(update('e1', { tag: 'x' }));
  });

  it('requires a valid status and updatedAt', async () => {
    await assertFails(update('e1', { status: 'archived' }));
    await assertFails(updateDoc(doc(admin, 'inquiries', 'e1'), { status: 'contacted' }));
  });

  it('requires bookingId for converted', async () => {
    await assertFails(update('e1', { status: 'converted' }));
    await assertSucceeds(update('e1', { status: 'converted', bookingId: 'b9', clientId: 'c9', convertedAt: now() }));
  });

  it('keeps converted final', async () => {
    await assertFails(update('e2', { status: 'contacted' }));
    await assertFails(update('e2', { status: 'closed' }));
  });

  it('deletes non-converted Enquiries only', async () => {
    await assertSucceeds(deleteDoc(doc(admin, 'inquiries/e1')));
    await assertFails(deleteDoc(doc(admin, 'inquiries/e2')));
  });

  it('still lets the public create (and not admins-only fields)', async () => {
    const anon = contextDb(env.unauthenticatedContext());
    await assertSucceeds(addDoc(collection(anon, 'inquiries'), enquiry({ createdAt: now() })));
    await assertFails(addDoc(collection(anon, 'inquiries'), enquiry({ createdAt: now(), adminNotes: 'x' })));
  });
});
