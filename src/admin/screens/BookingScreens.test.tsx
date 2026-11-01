/**
 * Seam 5: Booking detail and New booking against the Auth + Firestore emulators with the real rules.
 * New booking → detail, section Edit/Save/Cancel, payments → Money rail, Cancel dialog, Enquiry Convert.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, seed, seedAdmins } from '../../test/adminAuth';
import { contextDb, createRulesEnv, readAll } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { formatDate, todayIST } from '../model';

const PROJECT_ID = 'demo-udan-admin-bookings';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

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
  status: 'Pending',
  destination: 'Dubai',
  travelStart: '2026-12-01',
  travelEnd: '2026-12-05',
  pax: { adults: 2, children: 0, infants: 0 },
  travellerNames: [],
  itinerary: '',
  internalNotes: '',
  sellingPrice: 150_000,
  lines: [
    { id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000 },
    { id: 'l2', type: 'Transfer', dmcId: 'd2', description: 'Airport transfers', netCost: 10_000 },
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

async function renderAdmin(path: string) {
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-owner', email: ADMIN_EMAIL, email_verified: true })));
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const section = (name: string) => screen.getByRole('region', { name });
const rail = () => screen.getByRole('complementary', { name: 'Money and documents' });
/** The value next to a label in the Money rail. */
function money(label: string): string {
  const dt = within(rail()).getByText(label, { selector: 'dt' });
  return dt.nextElementSibling?.textContent ?? '';
}
async function typeMoney(user: UserEvent, input: HTMLElement, amount: string) {
  await user.clear(input);
  await user.type(input, amount);
}
const setDate = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });

beforeAll(async () => {
  if (!AUTH_HOST) throw new Error('Auth emulator not running. Use `npm test` or `npm run emulators`.');
  env = await createRulesEnv(PROJECT_ID);
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await seedAdmins(env);
  await seed(env, {
    'clients/c1': { name: 'Asha Patel', mobile: '+919811111111', city: 'Surat', createdAt: now, updatedAt: now },
    'dmcs/d1': { name: 'Desert Tours', createdAt: now, updatedAt: now },
    'dmcs/d2': { name: 'Gulf Transfers', createdAt: now, updatedAt: now },
    'counters/booking': { seq: 1 },
    'bookings/b1': BOOKING,
  });
  app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `bookings-${++appCount}`);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const { host, port } = env.emulators.firestore!;
  connectFirestoreEmulator(db, host, port);
});
afterEach(async () => {
  await deleteApp(app);
});

describe('New booking', () => {
  it('creates the booking with the next Booking ID and lands on its detail page', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/bookings/new?start=2026-12-10');

    expect(await screen.findByRole('heading', { level: 1, name: 'New booking' })).toBeInTheDocument();
    expect(await screen.findByText(/Gets UDN-002 on save/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Client payments' })).not.toBeInTheDocument();

    // Create with nothing filled → errors, nothing written.
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(screen.getByText('Fix the highlighted fields, then create the booking.')).toBeInTheDocument();
    expect(within(section('Client')).getByText('Choose a Client.')).toBeInTheDocument();

    // Client: type-ahead on name.
    await user.type(within(section('Client')).getByRole('combobox', { name: 'Client' }), 'asha');
    await user.click(await screen.findByRole('option', { name: /Asha Patel/ }));

    const travel = section('Travel');
    await user.type(within(travel).getByLabelText('Destination'), 'Bali');
    expect(within(travel).getByLabelText('Travel start')).toHaveValue('2026-12-10'); // ?start=
    setDate(within(travel).getByLabelText('Travel end'), '2026-12-15');
    await user.type(within(travel).getByLabelText('Traveller names'), 'Asha Patel{Enter}');

    await typeMoney(user, within(section('Price')).getByLabelText('Selling price'), '120000');
    expect(money('Selling price')).toBe('₹1,20,000');

    const lines = section('Service lines');
    await user.click(within(lines).getByRole('button', { name: 'Add service line' }));
    const line = within(lines).getByRole('listitem', { name: 'Line 1' });
    await user.selectOptions(within(line).getByLabelText('DMC'), 'Desert Tours');
    await user.type(within(line).getByLabelText('Description'), 'Villa 5N');
    await typeMoney(user, within(line).getByLabelText('Net cost'), '80000');
    // Rail recomputes live from the unsaved form.
    expect(money('Net cost')).toBe('₹80,000');
    expect(money('Commission')).toBe('₹40,000');

    await user.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' }); // detail loaded
    expect(router.state.location.pathname).toBe('/admin/bookings/UDN-002');
    expect(screen.getByText('Pending', { selector: '.adm-badge' })).toBeInTheDocument();
    expect(within(section('Client')).getByRole('link', { name: 'Asha Patel' })).toHaveAttribute('href', '/admin/clients/c1');

    const stored = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002');
    expect(stored).toMatchObject({
      bookingSeq: 2,
      clientId: 'c1',
      status: 'Pending',
      destination: 'Bali',
      travelStart: '2026-12-10',
      travelEnd: '2026-12-15',
      travellerNames: ['Asha Patel'],
      sellingPrice: 120_000,
      lines: [expect.objectContaining({ type: 'Hotel', dmcId: 'd1', description: 'Villa 5N', netCost: 80_000 })],
      clientPayments: [],
      dmcPayments: [],
    });
    expect(await readDoc('counters/booking')).toEqual({ seq: 2 });
  });

  it('creates a new Client inline in the same write', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new');
    const client = await screen.findByRole('region', { name: 'Client' });
    await user.click(within(client).getByRole('button', { name: 'New client' }));
    await user.type(within(client).getByLabelText('Name'), 'Ravi Mehta');
    // Mobile already used by Asha → error.
    await user.type(within(client).getByLabelText('Mobile'), '98111 11111');
    const travel = section('Travel');
    await user.type(within(travel).getByLabelText('Destination'), 'Goa');
    setDate(within(travel).getByLabelText('Travel start'), '2026-12-01');
    setDate(within(travel).getByLabelText('Travel end'), '2026-12-03');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(within(client).getByText(/Asha Patel already has this mobile/)).toBeInTheDocument();

    await user.clear(within(client).getByLabelText('Mobile'));
    await user.type(within(client).getByLabelText('Mobile'), '098222 22222');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' }); // detail loaded

    const ravi = (await readAll(env, 'clients')).find((c) => c.name === 'Ravi Mehta');
    expect(ravi).toMatchObject({ mobile: '+919822222222' });
    expect((await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')).toMatchObject({ clientId: ravi!.id });
  });
});

describe('Booking detail sections', () => {
  it('Edit swaps a section into fields; Cancel discards; Save writes only that section', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    expect(await screen.findByRole('heading', { level: 1, name: /UDN-001/ })).toBeInTheDocument();
    expect(await screen.findByText('Asha Patel, Dubai, 1 Dec 2026 – 5 Dec 2026')).toBeInTheDocument();
    expect(money('Commission')).toBe('₹50,000');

    // Cancel discards.
    const travel = section('Travel');
    await user.click(within(travel).getByRole('button', { name: 'Edit Travel' }));
    await user.clear(within(travel).getByLabelText('Destination'));
    await user.type(within(travel).getByLabelText('Destination'), 'Abu Dhabi');
    await user.click(within(travel).getByRole('button', { name: 'Cancel' }));
    expect(within(travel).queryByLabelText('Destination')).not.toBeInTheDocument();
    expect(within(travel).getByText('Dubai')).toBeInTheDocument();

    // Several sections open; the rail shows unsaved values.
    const price = section('Price');
    await user.click(within(price).getByRole('button', { name: 'Edit Price' }));
    await typeMoney(user, within(price).getByLabelText('Selling price'), '160000');
    expect(money('Commission')).toBe('₹60,000');
    await user.click(within(travel).getByRole('button', { name: 'Edit Travel' }));
    await user.clear(within(travel).getByLabelText('Destination'));

    // Invalid Save stays open with the error; nothing written.
    await user.click(within(travel).getByRole('button', { name: 'Save' }));
    expect(within(travel).getByText('Enter a destination.')).toBeInTheDocument();
    await user.type(within(travel).getByLabelText('Destination'), 'Abu Dhabi');
    await user.click(within(travel).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(travel).queryByLabelText('Destination')).not.toBeInTheDocument());
    expect(await within(travel).findByText('Abu Dhabi')).toBeInTheDocument();

    // Price is still open and unsaved; the Travel save didn't write it.
    expect((await readDoc('bookings/b1'))?.sellingPrice).toBe(150_000);
    expect((await readDoc('bookings/b1'))?.destination).toBe('Abu Dhabi');
    expect(within(price).getByLabelText('Selling price')).toHaveValue('1,60,000');

    setDate(within(price).getByLabelText('Client balance due by'), '2026-11-25');
    await user.click(within(price).getByRole('button', { name: 'Save' }));
    expect(await within(price).findByText('₹1,60,000')).toBeInTheDocument();
    expect(within(price).getByText('25 Nov 2026')).toBeInTheDocument();
    expect(await readDoc('bookings/b1')).toMatchObject({ sellingPrice: 160_000, clientBalanceDueBy: '2026-11-25', destination: 'Abu Dhabi' });
    expect(money('Commission')).toBe('₹60,000');
  });

  it('Service lines: edit, delete and save the list; DMC created inline', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const lines = await screen.findByRole('region', { name: 'Service lines' });
    expect(within(lines).getAllByText('Missing')).toHaveLength(2);
    await user.click(within(lines).getByRole('button', { name: 'Edit Service lines' }));

    await user.click(within(lines).getByRole('button', { name: 'Delete line 2' }));
    await user.click(await screen.findByRole('button', { name: 'Delete line' }));
    expect(money('Net cost')).toBe('₹90,000');

    const line1 = within(lines).getByRole('listitem', { name: 'Line 1' });
    await user.type(within(line1).getByLabelText('Confirmation no.'), 'ATL-77');
    await user.selectOptions(within(line1).getByLabelText('DMC'), '+ New DMC…');
    const dialog = await screen.findByRole('dialog', { name: 'New DMC' });
    await user.type(within(dialog).getByLabelText('Name'), 'Oasis DMC');
    await user.click(within(dialog).getByRole('button', { name: 'Create DMC' }));
    await waitFor(() => expect(within(line1).getByLabelText('DMC')).toHaveDisplayValue('Oasis DMC'));

    await user.click(within(lines).getByRole('button', { name: 'Save' }));
    expect(await within(lines).findByRole('link', { name: 'Oasis DMC' })).toBeInTheDocument();
    expect(within(lines).getByText('ATL-77')).toBeInTheDocument();
    const oasis = (await readAll(env, 'dmcs')).find((d) => d.name === 'Oasis DMC')!;
    const stored = await readDoc('bookings/b1');
    expect(stored?.lines).toEqual([{ id: 'l1', type: 'Hotel', dmcId: oasis.id, description: 'Atlantis 4N', netCost: 90_000, confirmationNo: 'ATL-77' }]);
  });
});

describe('Payments', () => {
  it('add, edit and delete a Client Payment update the Money rail; DMC entries go against a line DMC', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const payments = await screen.findByRole('region', { name: 'Client payments' });
    expect(money('Client outstanding')).toBe('₹1,50,000');
    expect(within(payments).getByText('No entries yet.')).toBeInTheDocument();

    // Add.
    await user.click(within(payments).getByRole('button', { name: 'Add entry' }));
    const row = within(payments).getByRole('group', { name: 'New entry' });
    expect(within(row).getByLabelText('Date')).toHaveValue(todayIST());
    await user.selectOptions(within(row).getByLabelText('Mode'), 'Bank transfer');
    await user.type(within(row).getByLabelText('Reference'), 'UTR123');
    await user.click(within(row).getByRole('button', { name: 'Add entry' }));
    expect(within(row).getByText('Enter a whole rupee amount above 0.')).toBeInTheDocument();
    await typeMoney(user, within(row).getByLabelText('Amount'), '50000');
    await user.click(within(row).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('Client outstanding')).toBe('₹1,00,000'));
    expect(within(payments).getByText('UTR123')).toBeInTheDocument();

    // Edit (pencil, same row).
    await user.click(within(payments).getByRole('button', { name: /^Edit payment of ₹50,000/ }));
    const edit = within(payments).getByRole('group', { name: 'Edit entry' });
    await typeMoney(user, within(edit).getByLabelText('Amount'), '60000');
    await user.click(within(edit).getByRole('button', { name: 'Save entry' }));
    await waitFor(() => expect(money('Client outstanding')).toBe('₹90,000'));

    // A Refund shows as −₹X and nets off.
    await user.click(within(payments).getByRole('button', { name: 'Add entry' }));
    const refund = within(payments).getByRole('group', { name: 'New entry' });
    await user.selectOptions(within(refund).getByLabelText('Kind'), 'Refund');
    await typeMoney(user, within(refund).getByLabelText('Amount'), '5000');
    await user.click(within(refund).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('Client outstanding')).toBe('₹95,000'));
    expect(within(payments).getByText('−₹5,000')).toBeInTheDocument();

    // Delete (confirm).
    await user.click(within(payments).getByRole('button', { name: /^Delete payment of ₹60,000/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(money('Client outstanding')).toBe('₹1,55,000'));
    const stored = await readDoc('bookings/b1');
    expect(stored?.clientPayments).toEqual([expect.objectContaining({ kind: 'Refund', amount: 5000 })]);

    // DMC side: only line DMCs are offered.
    const dmc = section('DMC payments');
    await user.click(within(dmc).getByRole('button', { name: 'Add entry' }));
    const dmcRow = within(dmc).getByRole('group', { name: 'New entry' });
    expect(within(within(dmcRow).getByLabelText('DMC')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Desert Tours', 'Gulf Transfers']);
    await user.selectOptions(within(dmcRow).getByLabelText('DMC'), 'Gulf Transfers');
    await typeMoney(user, within(dmcRow).getByLabelText('Amount'), '10000');
    await user.click(within(dmcRow).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('DMC outstanding')).toBe('₹90,000'));
    expect(within(dmc).getByText('Settled')).toBeInTheDocument();
  });
});

describe('Status and cancellation', () => {
  it('Cancel dialog previews the outcome, writes the cancellation, and un-cancel clears it', async () => {
    await seed(env, {
      'bookings/b1': {
        ...BOOKING,
        status: 'Confirmed',
        clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-10-01', amount: 50_000, mode: 'UPI' }],
        dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-10-02', amount: 40_000, mode: 'UPI', dmcId: 'd1' }],
      },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const status = await screen.findByRole('combobox', { name: 'Status' });

    await user.selectOptions(status, 'Cancelled');
    const dialog = await screen.findByRole('dialog', { name: 'Cancel UDN-001?' });
    expect(within(dialog).getByText(/Replaces the Selling price \(₹1,50,000\)/)).toBeInTheDocument();
    const preview = within(dialog).getByRole('region', { name: 'Preview' });
    // Defaults (all charges 0): full refund to the Client, everything paid to DMCs due back.
    expect(preview).toHaveTextContent('Commission becomes₹0');
    expect(preview).toHaveTextContent('Refund owed ₹50,000');
    expect(preview).toHaveTextContent('Due back ₹40,000');

    await typeMoney(user, within(dialog).getByLabelText('Client cancellation charge'), '20000');
    await typeMoney(user, within(dialog).getByLabelText('DMC cancellation charge for Hotel, Desert Tours'), '10000');
    expect(preview).toHaveTextContent('Commission becomes₹10,000');
    expect(preview).toHaveTextContent('Refund owed ₹30,000');
    expect(preview).toHaveTextContent('Due back ₹30,000');

    // Reason is required.
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    expect(within(dialog).getByText('Enter a reason.')).toBeInTheDocument();
    expect((await readDoc('bookings/b1'))?.status).toBe('Confirmed');

    await user.type(within(dialog).getByLabelText('Reason'), 'Client medical emergency');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    expect(await screen.findByText(`Cancelled ${formatDate(todayIST())}: Client medical emergency`)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(money('Client cancellation charge')).toBe('₹20,000');
    expect(money('Commission')).toBe('₹10,000');
    expect(money('Client outstanding')).toBe('Refund ₹30,000');
    expect(money('DMC outstanding')).toBe('Due back ₹30,000');
    expect(await readDoc('bookings/b1')).toMatchObject({
      status: 'Cancelled',
      cancelledAt: todayIST(),
      cancelReason: 'Client medical emergency',
      clientCancellationCharge: 20_000,
      lines: [expect.objectContaining({ id: 'l1', dmcCancellationCharge: 10_000 }), expect.objectContaining({ id: 'l2', dmcCancellationCharge: 0 })],
    });
    expect(screen.getByText(/Choosing another status un-cancels/)).toBeInTheDocument();

    // Un-cancel: back to Confirmed, cancellation fields cleared, payments kept.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Confirmed');
    await waitFor(() => expect(screen.queryByText(/Client medical emergency/)).not.toBeInTheDocument());
    const stored = (await readDoc('bookings/b1'))!;
    expect(stored.status).toBe('Confirmed');
    expect(stored).not.toHaveProperty('cancelledAt');
    expect(stored).not.toHaveProperty('cancelReason');
    expect(stored).not.toHaveProperty('clientCancellationCharge');
    expect((stored.lines as Record<string, unknown>[]).every((l) => !('dmcCancellationCharge' in l))).toBe(true);
    expect(stored.clientPayments).toHaveLength(1);
    expect(money('Commission')).toBe('₹50,000');
  });

  it('warns (but saves) Voucher Received while lines lack confirmation numbers', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'Voucher Received');
    expect(await screen.findByText('2 Service Lines have no confirmation number yet. Status saved anyway.')).toBeInTheDocument();
    expect((await readDoc('bookings/b1'))?.status).toBe('Voucher Received');
  });
});

describe('Enquiry Convert', () => {
  const enquiry = (o: Record<string, unknown> = {}) => ({
    name: 'Asha P',
    phone: '+919811111111',
    service: 'visa-services',
    message: 'Dubai visa for two',
    sourcePage: '/contact',
    destination: 'Dubai',
    status: 'new',
    createdAt: new Date('2026-10-20T06:00:00Z'),
    ...o,
  });

  it('matches the Client by mobile, prefills, and converts the Enquiry in the same write', async () => {
    await seed(env, { 'inquiries/e1': enquiry() });
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/bookings/new?enquiry=e1');

    const client = await screen.findByRole('region', { name: 'Client' });
    expect(within(client).getByText('Matched existing Client Asha Patel by mobile +919811111111. Confirm or pick another.')).toBeInTheDocument();
    expect(within(client).getByRole('button', { name: 'Existing client' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(client).getByRole('combobox', { name: 'Client' })).toHaveValue('Asha Patel, +919811111111');
    expect(within(section('Travel')).getByLabelText('Destination')).toHaveValue('Dubai');
    expect(within(section('Notes')).getByLabelText('Internal notes')).toHaveValue('From enquiry 20 Oct 2026: Visa Services — Dubai visa for two');

    setDate(within(section('Travel')).getByLabelText('Travel start'), '2026-12-01');
    setDate(within(section('Travel')).getByLabelText('Travel end'), '2026-12-04');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' }); // detail loaded
    expect(router.state.location.pathname).toBe('/admin/bookings/UDN-002');
    expect(within(section('Notes')).getByRole('link', { name: /From enquiry/ })).toBeInTheDocument();

    const booking = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')!;
    expect(booking).toMatchObject({ clientId: 'c1', enquiryId: 'e1', destination: 'Dubai', status: 'Pending' });
    expect(await readDoc('inquiries/e1')).toMatchObject({ status: 'converted', clientId: 'c1', bookingId: booking.id });
    expect(await readAll(env, 'clients')).toHaveLength(1);
  });

  it('without a mobile match, prefills a new Client that is created with the Booking', async () => {
    await seed(env, { 'inquiries/e2': enquiry({ name: 'Neha Shah', phone: '+919833333333' }) });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new?enquiry=e2');

    const client = await screen.findByRole('region', { name: 'Client' });
    expect(within(client).getByText('No Client with mobile +919833333333. A new Client will be created.')).toBeInTheDocument();
    expect(within(client).getByRole('button', { name: 'New client' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(client).getByLabelText('Name')).toHaveValue('Neha Shah');
    expect(within(client).getByLabelText('Mobile')).toHaveValue('+919833333333');

    setDate(within(section('Travel')).getByLabelText('Travel start'), '2026-12-01');
    setDate(within(section('Travel')).getByLabelText('Travel end'), '2026-12-04');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' }); // detail loaded

    const neha = (await readAll(env, 'clients')).find((c) => c.mobile === '+919833333333')!;
    expect(neha).toMatchObject({ name: 'Neha Shah' });
    expect(await readDoc('inquiries/e2')).toMatchObject({ status: 'converted', clientId: neha.id });
  });

  it('an already converted Enquiry links to its Booking instead of the form', async () => {
    await seed(env, { 'inquiries/e3': enquiry({ status: 'converted', bookingId: 'b1', clientId: 'c1', convertedAt: now }) });
    await renderAdmin('/admin/bookings/new?enquiry=e3');
    expect(await screen.findByText('This Enquiry was already converted.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View UDN-001' })).toHaveAttribute('href', '/admin/bookings/UDN-001');
    expect(screen.queryByRole('button', { name: 'Create booking' })).not.toBeInTheDocument();
  });
});

describe('Data region states', () => {
  it('shows "No booking" for an unknown Booking ID', async () => {
    await renderAdmin('/admin/bookings/UDN-999');
    expect(await screen.findByRole('heading', { name: 'No booking UDN-999' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bookings' })).toHaveAttribute('href', '/admin?view=table&scope=all');
  });
});
