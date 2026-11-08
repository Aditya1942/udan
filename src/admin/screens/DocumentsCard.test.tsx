/**
 * Seam 5: the Documents card on Booking detail (Auth + Firestore emulators, real rules). The PDF render is mocked
 * (the real templates are smoke-rendered in `pdf/render.test.ts`); everything else is real: the invoice-number
 * transaction, the seeded Business profile, the share message and the send links.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_EMAIL, seed, seedAdmins } from '../../test/adminAuth';
import { clearFirestore, contextDb, createRulesEnv } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { fyOf, mailtoUrl, todayIST, whatsappUrl, type Booking } from '../model';

// Stand-in for the lazy PDF chunk: same names and Files as the real prepare, without react-pdf.
const pdf = vi.hoisted(() => ({
  prepareInvoice: vi.fn(async (booking: { invoiceNo?: string }) => {
    const { invoiceFilename } = await import('../model');
    return new File(['%PDF-1.3'], invoiceFilename(booking.invoiceNo!), { type: 'application/pdf' });
  }),
  prepareVoucher: vi.fn(async (booking: { bookingNo: string }) => {
    const { voucherFilename } = await import('../model');
    return new File(['%PDF-1.3'], voucherFilename(booking.bookingNo), { type: 'application/pdf' });
  }),
}));
vi.mock('../pdf', () => pdf);

const PROJECT_ID = 'demo-udan-admin-documents';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const TRADING_NAME = 'UDAN Immigration & Tours';
const FY = fyOf(todayIST());
const INVOICE_NO = `UDAN/${FY}/001`;

let env: RulesTestEnvironment;
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let appCount = 0;

const now = new Date();
const BOOKING = {
  bookingNo: 'UDN-001',
  bookingSeq: 1,
  clientId: 'c1',
  status: 'Confirmed',
  destination: 'Dubai',
  travelStart: '2026-12-01',
  travelEnd: '2026-12-05',
  pax: { adults: 2, children: 0, infants: 0 },
  travellerNames: [],
  itinerary: '',
  internalNotes: '',
  sellingPrice: 150_000,
  lines: [
    { id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', start: '2026-12-01', netCost: 90_000, confirmationNo: 'ATL-1' },
    { id: 'l2', type: 'Transfer', dmcId: 'd1', description: 'Airport transfers', netCost: 10_000 },
  ],
  clientPayments: [] as unknown[],
  dmcPayments: [] as unknown[],
  createdAt: now,
  updatedAt: now,
};

async function readDoc(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(contextDb(ctx), path))).data();
  });
  return data;
}

async function renderBooking(bookingNo = 'UDN-001') {
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-owner', email: ADMIN_EMAIL, email_verified: true })));
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} /> }], { initialEntries: [`/admin/bookings/${bookingNo}`] });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1, name: bookingNo });
  await screen.findByRole('region', { name: 'Documents' });
}

const card = () => screen.getByRole('region', { name: 'Documents' });
const row = (name: 'Invoice' | 'Voucher') => within(card()).getByRole('listitem', { name });

function setNavigator(props: Partial<Record<'canShare' | 'share', unknown>>) {
  for (const [key, value] of Object.entries(props)) Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

beforeAll(async () => {
  if (!AUTH_HOST) throw new Error('Auth emulator not running. Use `npm test` or `npm run emulators`.');
  env = await createRulesEnv(PROJECT_ID);
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:doc-${++n}`) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  pdf.prepareInvoice.mockClear();
  pdf.prepareVoucher.mockClear();
  await clearFirestore(env);
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await seedAdmins(env);
  await seed(env, {
    'clients/c1': { name: 'Asha Patel', mobile: '+919811111111', email: 'asha@example.com', createdAt: now, updatedAt: now },
    'clients/c2': { name: 'Ravi Mehta', mobile: '+919822222222', createdAt: now, updatedAt: now },
    'dmcs/d1': { name: 'Desert Tours', createdAt: now, updatedAt: now },
    'counters/booking': { seq: 3 },
    'bookings/b1': BOOKING,
    'bookings/b2': {
      ...BOOKING,
      bookingNo: 'UDN-002',
      bookingSeq: 2,
      clientId: 'c2',
      status: 'Cancelled',
      cancelledAt: '2026-11-20',
      cancelReason: 'Visa refused',
      clientCancellationCharge: 20_000,
    },
  });
  app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `documents-${++appCount}`);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const { host, port } = env.emulators.firestore!;
  connectFirestoreEmulator(db, host, port);
});
afterEach(async () => {
  setNavigator({ canShare: undefined, share: undefined });
  cleanup();
  await deleteApp(app);
});

describe('Documents card', () => {
  it('Invoice: first Prepare allocates the number; Preview, Download, WhatsApp and Email carry the file and the prefilled message', async () => {
    const user = userEvent.setup();
    await renderBooking();

    expect(within(row('Invoice')).getByText('Number assigned when first prepared')).toBeInTheDocument();
    await user.click(within(row('Invoice')).getByRole('button', { name: 'Prepare Invoice' }));

    // The PDF is built from the Booking with its new invoice number and the seeded Business profile.
    await within(row('Invoice')).findByRole('link', { name: 'Download Invoice' });
    expect(pdf.prepareInvoice).toHaveBeenCalledTimes(1);
    const [booking, data] = pdf.prepareInvoice.mock.calls[0] as unknown as [Booking, { profile: { tradingName?: string }; client: { name: string } }];
    expect(booking.invoiceNo).toBe(INVOICE_NO);
    expect(data.profile.tradingName).toBe(TRADING_NAME);
    expect(data.client.name).toBe('Asha Patel');

    // Stored once: Booking + per-FY counter.
    expect(await readDoc('bookings/b1')).toMatchObject({ invoiceNo: INVOICE_NO, invoiceSeq: 1, invoiceDate: todayIST() });
    expect(await readDoc(`counters/invoice-${FY}`)).toEqual({ seq: 1 });

    const invoice = row('Invoice');
    const filename = `UDAN-Invoice-UDAN_${FY}_001.pdf`;
    expect(within(invoice).getByText(filename)).toBeInTheDocument();
    expect(within(invoice).getByRole('link', { name: 'Download Invoice' })).toHaveAttribute('download', filename);
    expect(within(invoice).getByRole('link', { name: 'Preview Invoice' })).toHaveAttribute('target', '_blank');
    expect(within(invoice).getByRole('link', { name: 'Download Invoice' }).getAttribute('href')).toMatch(/^blob:/);

    const message = `Hi Asha, please find your invoice for booking UDN-001 attached. — ${TRADING_NAME}`;
    expect(within(invoice).getByRole('link', { name: 'WhatsApp Invoice' })).toHaveAttribute('href', whatsappUrl('+919811111111', message));
    expect(within(invoice).getByRole('link', { name: 'Email Invoice' })).toHaveAttribute(
      'href',
      mailtoUrl('asha@example.com', `Invoice ${INVOICE_NO} — ${TRADING_NAME}`, message),
    );
    // No Web Share with files here (jsdom) → no Share button.
    expect(within(invoice).queryByRole('button', { name: 'Share Invoice' })).not.toBeInTheDocument();

    // Prepare again keeps the number (no second allocation).
    await user.click(within(invoice).getByRole('button', { name: 'Prepare again' }));
    await waitFor(() => expect(pdf.prepareInvoice).toHaveBeenCalledTimes(2));
    expect((pdf.prepareInvoice.mock.calls[1][0] as Booking).invoiceNo).toBe(INVOICE_NO);
    expect(await readDoc(`counters/invoice-${FY}`)).toEqual({ seq: 1 });
  });

  it('Share appears only when the browser can share the file; abort is silent, other failures toast', async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValueOnce(Object.assign(new Error('cancelled'), { name: 'AbortError' })).mockRejectedValueOnce(new Error('nope'));
    setNavigator({ canShare: vi.fn(({ files }: { files: File[] }) => files.length === 1), share });
    await renderBooking();

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Prepare Voucher' }));
    const shareButton = await within(row('Voucher')).findByRole('button', { name: 'Share Voucher' });

    await user.click(shareButton);
    expect(share).toHaveBeenCalledWith({
      files: [expect.any(File)],
      title: 'UDAN-Voucher-UDN-001.pdf',
      text: `Hi Asha, please find your travel voucher for booking UDN-001 attached. — ${TRADING_NAME}`,
    });
    expect(screen.queryByText("Couldn't share the file. Use Download instead.")).not.toBeInTheDocument();

    await user.click(shareButton);
    expect(await screen.findByText("Couldn't share the file. Use Download instead.")).toBeInTheDocument();
  });

  it('Voucher: notes missing confirmations and prepares without touching the invoice number', async () => {
    const user = userEvent.setup();
    await renderBooking();
    expect(within(row('Voucher')).getByText('1 line will print "To be confirmed"')).toBeInTheDocument();

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Prepare Voucher' }));
    await within(row('Voucher')).findByRole('link', { name: 'Download Voucher' });
    expect(pdf.prepareVoucher).toHaveBeenCalledTimes(1);
    expect(pdf.prepareInvoice).not.toHaveBeenCalled();
    expect((await readDoc('bookings/b1'))?.invoiceNo).toBeUndefined();
    expect(within(row('Voucher')).getByText('UDAN-Voucher-UDN-001.pdf')).toBeInTheDocument();
    expect(within(row('Voucher')).getByRole('link', { name: 'Email Voucher' })).toHaveAttribute(
      'href',
      expect.stringContaining(`subject=${encodeURIComponent(`Travel voucher UDN-001 — ${TRADING_NAME}`)}`),
    );
  });

  it('Cancelled: Voucher disabled "Booking cancelled"; Invoice still prepares; no Email without a Customer email', async () => {
    const user = userEvent.setup();
    await renderBooking('UDN-002');

    expect(within(row('Voucher')).getByText('Booking cancelled')).toBeInTheDocument();
    expect(within(row('Voucher')).queryByRole('button')).not.toBeInTheDocument();

    await user.click(within(row('Invoice')).getByRole('button', { name: 'Prepare Invoice' }));
    await within(row('Invoice')).findByRole('link', { name: 'Download Invoice' });
    expect((await readDoc('bookings/b2'))?.invoiceNo).toBe(INVOICE_NO);
    expect(within(row('Invoice')).getByRole('link', { name: 'WhatsApp Invoice' })).toHaveAttribute('href', expect.stringContaining('https://wa.me/919822222222?text=Hi%20Ravi'));
    expect(within(row('Invoice')).queryByRole('link', { name: 'Email Invoice' })).not.toBeInTheDocument();
  });

  it('a render failure shows an inline error with Retry', async () => {
    const user = userEvent.setup();
    pdf.prepareVoucher.mockRejectedValueOnce(new Error('font failed'));
    await renderBooking();

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Prepare Voucher' }));
    expect(await within(row('Voucher')).findByRole('alert')).toHaveTextContent("Couldn't build the Voucher PDF. Try again.");

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Retry' }));
    expect(await within(row('Voucher')).findByRole('link', { name: 'Download Voucher' })).toBeInTheDocument();
  });
});
