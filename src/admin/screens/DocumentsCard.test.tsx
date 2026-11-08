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
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_EMAIL, seed, seedAdmins } from '../../test/adminAuth';
import { clearFirestore, contextDb, createRulesEnv } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { fyOf, todayIST, type Booking } from '../model';

// Stand-in for the lazy PDF chunk: same names and Files as the real prepare, without react-pdf.
const pdf = vi.hoisted(() => ({
  prepareDocument: vi.fn(async (kind: 'invoice' | 'admin' | 'voucher', booking: { invoiceNo?: string; bookingNo: string }, _data: unknown) => {
    const { adminInvoiceFilename, invoiceFilename, voucherFilename } = await import('../model');
    const name =
      kind === 'invoice' ? invoiceFilename(booking.invoiceNo!) : kind === 'admin' ? adminInvoiceFilename(booking.bookingNo) : voucherFilename(booking.bookingNo);
    return new File(['%PDF-1.3'], name, { type: 'application/pdf' });
  }),
}));
vi.mock('../pdf', () => pdf);
// Settings → Templates preview renders react-pdf; not under test here.
vi.mock('../pdf/settingsPreview', () => ({ default: ({ familyId }: { familyId: string }) => <p>Preview of {familyId}</p> }));

type PrepareCall = [kind: string, booking: Booking, data: { profile: { tradingName?: string }; client: { name: string }; family: string }];
const calls = () => pdf.prepareDocument.mock.calls as unknown as PrepareCall[];

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

async function readShares(): Promise<(Record<string, unknown> & { id: string })[]> {
  let out: (Record<string, unknown> & { id: string })[] = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = (await getDocs(collection(contextDb(ctx), 'shares'))).docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  return out;
}

async function renderAt(path: string) {
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-owner', email: ADMIN_EMAIL, email_verified: true })));
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

async function renderBooking(bookingNo = 'UDN-001') {
  await renderAt(`/admin/bookings/${bookingNo}`);
  await screen.findByRole('heading', { level: 1, name: bookingNo });
  await screen.findByRole('region', { name: 'Documents' });
}

const card = () => screen.getByRole('region', { name: 'Documents' });
const row = (name: 'Invoice' | 'Voucher' | 'Admin invoice') => within(card()).getByRole('listitem', { name });

function setNavigator(props: Partial<Record<'canShare' | 'share' | 'clipboard', unknown>>) {
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
  pdf.prepareDocument.mockClear();
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

    expect(within(row('Invoice')).getByText('Number assigned when first prepared or sent')).toBeInTheDocument();
    await user.click(within(row('Invoice')).getByRole('button', { name: 'Prepare Invoice' }));

    // The PDF is built from the Booking with its new invoice number and the seeded Business profile.
    await within(row('Invoice')).findByRole('link', { name: 'Download Invoice' });
    expect(pdf.prepareDocument).toHaveBeenCalledTimes(1);
    const [kind, booking, data] = calls()[0];
    expect(kind).toBe('invoice');
    expect(data.family).toBe('current'); // no Settings default yet → fallback
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

    expect(within(invoice).getByRole('button', { name: 'WhatsApp Invoice' })).toBeInTheDocument();
    expect(within(invoice).getByRole('button', { name: 'Email Invoice' })).toBeInTheDocument();
    // No Web Share with files here (jsdom) → no Share button.
    expect(within(invoice).queryByRole('button', { name: 'Share Invoice' })).not.toBeInTheDocument();

    // Prepare again keeps the number (no second allocation).
    await user.click(within(invoice).getByRole('button', { name: 'Prepare again' }));
    await waitFor(() => expect(pdf.prepareDocument).toHaveBeenCalledTimes(2));
    expect(calls()[1][1].invoiceNo).toBe(INVOICE_NO);
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
    expect(calls().map((c) => c[0])).toEqual(['voucher']);
    expect((await readDoc('bookings/b1'))?.invoiceNo).toBeUndefined();
    expect(within(row('Voucher')).getByText('UDAN-Voucher-UDN-001.pdf')).toBeInTheDocument();
  });

  it('Cancelled: Voucher disabled "Booking cancelled"; Invoice still prepares', async () => {
    const user = userEvent.setup();
    await renderBooking('UDN-002');

    expect(within(row('Voucher')).getByText('Booking cancelled')).toBeInTheDocument();
    expect(within(row('Voucher')).queryByRole('button')).not.toBeInTheDocument();

    await user.click(within(row('Invoice')).getByRole('button', { name: 'Prepare Invoice' }));
    await within(row('Invoice')).findByRole('link', { name: 'Download Invoice' });
    expect((await readDoc('bookings/b2'))?.invoiceNo).toBe(INVOICE_NO);
  });

  it('a render failure shows an inline error with Retry', async () => {
    const user = userEvent.setup();
    pdf.prepareDocument.mockRejectedValueOnce(new Error('font failed'));
    await renderBooking();

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Prepare Voucher' }));
    expect(await within(row('Voucher')).findByRole('alert')).toHaveTextContent("Couldn't build the Voucher PDF. Try again.");

    await user.click(within(row('Voucher')).getByRole('button', { name: 'Retry' }));
    expect(await within(row('Voucher')).findByRole('link', { name: 'Download Voucher' })).toBeInTheDocument();
  });

  it('a Passport Booking shows the Invoice row and no Voucher row', async () => {
    const { travelStart: _start, travelEnd: _end, ...rest } = BOOKING;
    await seed(env, {
      'bookings/b3': {
        ...rest,
        bookingNo: 'UDN-003',
        bookingSeq: 3,
        category: 'Passport',
        hasTravel: false,
        destination: '',
        lines: [{ id: 'l1', type: 'Passport', description: 'Fresh passport', netCost: 1_000 }],
      },
    });
    await renderBooking('UDN-003');

    expect(row('Invoice')).toBeInTheDocument();
    expect(row('Admin invoice')).toBeInTheDocument();
    expect(within(card()).queryByRole('listitem', { name: 'Voucher' })).not.toBeInTheDocument();
  });

  it('Template picker starts on the Settings default; a picked template is used for the PDF', async () => {
    const user = userEvent.setup();
    await seed(env, { 'settings/documents': { defaults: { invoice: 'reference' }, messages: {}, updatedAt: now } });
    await renderBooking();

    const select = within(row('Invoice')).getByRole('combobox', { name: 'Invoice template' });
    await waitFor(() => expect(select).toHaveValue('reference'));
    await user.selectOptions(select, 'band');
    await user.click(within(row('Invoice')).getByRole('button', { name: 'Prepare Invoice' }));
    await within(row('Invoice')).findByRole('link', { name: 'Download Invoice' });
    expect(calls()[0][2].family).toBe('band');
    // The Voucher keeps its own default.
    expect(within(row('Voucher')).getByRole('combobox', { name: 'Voucher template' })).toHaveValue('current');
  });

  it('Admin invoice: prepares without allocating the invoice number and is never sendable', async () => {
    const user = userEvent.setup();
    await renderBooking();
    const admin = row('Admin invoice');
    expect(within(admin).queryByRole('button', { name: /WhatsApp|Email/ })).not.toBeInTheDocument();

    await user.click(within(admin).getByRole('button', { name: 'Prepare Admin invoice' }));
    await within(admin).findByRole('link', { name: 'Download Admin invoice' });
    expect(calls()[0][0]).toBe('admin');
    expect(within(admin).getByText('UDAN-Admin-invoice-UDN-001.pdf')).toBeInTheDocument();
    expect(within(admin).queryByRole('button', { name: /WhatsApp|Email/ })).not.toBeInTheDocument();
    expect((await readDoc('bookings/b1'))?.invoiceNo).toBeUndefined();
  });

  it('WhatsApp: creates a live link with the customer-safe invoice, prefilled message with the link; updates on Booking change; Disable turns it off', async () => {
    const user = userEvent.setup();
    await renderBooking();

    await user.click(within(row('Invoice')).getByRole('button', { name: 'WhatsApp Invoice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send invoice on WhatsApp' });
    const open = await within(dialog).findByRole('link', { name: 'Open WhatsApp' });

    const [share] = await readShares();
    expect(share).toMatchObject({ kind: 'invoice', bookingId: 'b1', family: 'current', active: true, issuedOn: todayIST(), unavailable: '' });
    expect(share.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const view = String(share.view);
    expect(view).toContain(INVOICE_NO);
    // Customer-safe: no DMC, net cost or internal fields.
    expect(view).not.toContain('Desert Tours');
    expect(view).not.toContain('90,000');
    expect(view).not.toMatch(/netCost|commission|dmc/i);
    expect((await readDoc('bookings/b1'))?.invoiceNo).toBe(INVOICE_NO);

    const href = open.getAttribute('href')!;
    expect(href.startsWith('https://wa.me/919811111111?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1]);
    expect(text).toContain('Hi Asha,');
    expect(text).toContain(`/d/${share.id}`);
    expect(text).toContain(INVOICE_NO);
    expect(text).toContain('Balance due: ₹1,50,000.');
    expect(within(dialog).getByRole('textbox', { name: 'Message' })).toHaveValue(text);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(await within(row('Invoice')).findByText(/Live link on/)).toBeInTheDocument();

    // ShareSync: a Booking change rewrites the link's data.
    await seed(env, { 'bookings/b1': { ...BOOKING, invoiceNo: INVOICE_NO, invoiceSeq: 1, invoiceDate: todayIST(), sellingPrice: 160_000 } });
    await waitFor(async () => expect(String((await readShares())[0].view)).toContain('1,60,000'));

    // Sending again keeps the same URL.
    await user.click(within(row('Invoice')).getByRole('button', { name: 'Email Invoice' }));
    const email = await screen.findByRole('dialog', { name: 'Email invoice' });
    const mail = await within(email).findByRole('link', { name: 'Open email' });
    expect(mail.getAttribute('href')).toContain(encodeURIComponent(`/d/${share.id}`));
    expect(within(email).getByRole('textbox', { name: 'Subject' })).toHaveValue(`Invoice ${INVOICE_NO} — ${TRADING_NAME}`);
    expect(await readShares()).toHaveLength(1);
    await user.click(within(email).getByRole('button', { name: 'Cancel' }));

    await user.click(within(row('Invoice')).getByRole('button', { name: 'Disable Invoice link' }));
    await user.click(await screen.findByRole('button', { name: 'Disable link' }));
    await waitFor(async () => expect((await readShares())[0]).toMatchObject({ active: false, view: '' }));
    await waitFor(() => expect(within(row('Invoice')).queryByText(/Live link on/)).not.toBeInTheDocument());
  });

  it('Voucher link message mentions services still being confirmed', async () => {
    const user = userEvent.setup();
    await renderBooking();
    await user.click(within(row('Voucher')).getByRole('button', { name: 'WhatsApp Voucher' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send voucher on WhatsApp' });
    await within(dialog).findByRole('link', { name: 'Open WhatsApp' });
    const text = (within(dialog).getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value;
    expect(text).toContain('Your travel voucher for Dubai');
    expect(text).toContain('1 service is still being confirmed.');
    const [share] = await readShares();
    expect(share).toMatchObject({ kind: 'voucher', title: 'Travel voucher UDN-001', filename: 'UDAN-Voucher-UDN-001.pdf' });
    expect((await readDoc('bookings/b1'))?.invoiceNo).toBeUndefined();
  });
});

describe('Settings → Templates', () => {
  it('sets a default template per document and saves custom message text', async () => {
    const user = userEvent.setup();
    await renderAt('/admin/settings/templates');
    await user.click(await screen.findByRole('button', { name: 'Voucher' }));
    const defaults = screen.getByRole('region', { name: 'Default templates' });
    await user.click(within(defaults).getByRole('button', { name: /^E-ticket/ }));
    expect(await within(defaults).findByText('Preview of ticket')).toBeInTheDocument();
    await user.click(within(defaults).getByRole('button', { name: 'Use as default' }));
    await waitFor(async () => expect((await readDoc('settings/documents'))?.defaults).toEqual({ voucher: 'ticket' }));

    const messages = screen.getByRole('region', { name: 'Messages' });
    const box = within(messages).getByRole('textbox', { name: 'Invoice · WhatsApp' });
    await user.clear(box);
    await user.type(box, 'Hello {{name}');
    await user.click(within(messages).getByRole('button', { name: 'Save messages' }));
    await waitFor(async () => expect(await readDoc('settings/documents')).toMatchObject({ defaults: { voucher: 'ticket' }, messages: { invoiceWhatsapp: 'Hello {name}' } }));
    expect(within(messages).getByText('Hello Asha')).toBeInTheDocument();
  });
});
