/**
 * Seam 5: Booking detail and New booking against the Auth + Firestore emulators with the real rules.
 * New booking → detail, section Edit/Save/Cancel, payments → Money rail, Cancel dialog, Enquiry Convert.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, seed, seedAdmins } from '../../test/adminAuth';
import { clearFirestore, contextDb, createRulesEnv, readAll } from '../../test/firestoreEmulator';
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
const pickCategory = (user: UserEvent, category: string) => user.selectOptions(within(section('Service')).getByLabelText('Category'), category);
async function pickAsha(user: UserEvent) {
  await user.type(within(section('Customer')).getByRole('combobox', { name: 'Customer' }), 'asha');
  await user.click(await screen.findByRole('option', { name: /Asha Patel/ }));
}

beforeAll(async () => {
  if (!AUTH_HOST) throw new Error('Auth emulator not running. Use `npm test` or `npm run emulators`.');
  env = await createRulesEnv(PROJECT_ID);
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await clearFirestore(env);
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
  // Unmount (stop the app's listeners) before deleting the app; setup.ts's cleanup runs after this hook.
  cleanup();
  await deleteApp(app);
});

describe('New booking', () => {
  it('creates the booking with the next Booking ID and lands on its detail page', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/bookings/new?start=2026-12-10');

    expect(await screen.findByRole('heading', { level: 1, name: 'New booking' })).toBeInTheDocument();
    expect(await screen.findByText(/Gets UDN-002 on save/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Customer payments' })).not.toBeInTheDocument();

    // Create with nothing filled → errors, nothing written.
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(screen.getByText('Fix the highlighted fields, then create the booking.')).toBeInTheDocument();
    expect(within(section('Customer')).getByText('Choose a Customer.')).toBeInTheDocument();

    // Client: type-ahead on name.
    await user.type(within(section('Customer')).getByRole('combobox', { name: 'Customer' }), 'asha');
    await user.click(await screen.findByRole('option', { name: /Asha Patel/ }));

    await pickCategory(user, 'Package');
    await user.click(within(section('Service')).getByRole('button', { name: 'Domestic' }));

    const travel = section('Travel');
    await user.type(within(travel).getByLabelText('Destination'), 'Bali');
    expect(within(travel).getByLabelText('Travel start')).toHaveValue('2026-12-10'); // ?start=
    setDate(within(travel).getByLabelText('Travel end'), '2026-12-15');
    expect(within(travel).queryByLabelText('Traveller names')).not.toBeInTheDocument();
    await user.type(within(section('Travellers')).getByLabelText('Traveller names'), 'Asha Patel{Enter}');

    await typeMoney(user, within(section('Price')).getByLabelText('Selling price'), '120000');
    expect(money('Selling price')).toBe('₹1,20,000');

    const lines = section('Service');
    const line = within(lines).getByRole('listitem', { name: 'Line 1' }); // a new Package starts with one blank card
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
    expect(within(section('Customer')).getByRole('link', { name: 'Asha Patel' })).toHaveAttribute('href', '/admin/customers/c1');

    const stored = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002');
    expect(stored).toMatchObject({
      bookingSeq: 2,
      clientId: 'c1',
      status: 'Pending',
      category: 'Package',
      tripScope: 'Domestic',
      hasTravel: true,
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

  it('creates a new Customer inline in the same write', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new');
    const client = await screen.findByRole('region', { name: 'Customer' });
    await user.click(within(client).getByRole('button', { name: 'New customer' }));
    await user.type(within(client).getByLabelText('Name'), 'Ravi Mehta');
    // Mobile already used by Asha → error.
    await user.type(within(client).getByLabelText('Mobile'), '98111 11111');
    await pickCategory(user, 'Hotel');
    await user.type(within(section('Service')).getByLabelText('Description'), 'Beach resort 3N');
    const travel = section('Travel');
    await user.click(within(travel).getByRole('button', { name: 'Add travel details' }));
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

    setDate(within(price).getByLabelText('Customer balance due by'), '2026-11-25');
    await user.click(within(price).getByRole('button', { name: 'Save' }));
    expect(await within(price).findByText('₹1,60,000')).toBeInTheDocument();
    expect(within(price).getByText('25 Nov 2026')).toBeInTheDocument();
    expect(await readDoc('bookings/b1')).toMatchObject({ sellingPrice: 160_000, clientBalanceDueBy: '2026-11-25', destination: 'Abu Dhabi' });
    expect(money('Commission')).toBe('₹60,000');
  });

  it('Service lines: edit, delete and save the list; DMC created inline', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const lines = await screen.findByRole('region', { name: 'Service' });
    expect(within(lines).getAllByText('Missing')).toHaveLength(2);
    await user.click(within(lines).getByRole('button', { name: 'Edit Service' }));
    await user.click(within(lines).getByRole('button', { name: 'Domestic' })); // legacy Package: Trip scope is required on save

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
    expect(stored).toMatchObject({ category: 'Package', tripScope: 'Domestic' });
  });

  it('a legacy Booking shows as Package with Travel and asks for Trip scope on Service save', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const service = await screen.findByRole('region', { name: 'Service' });
    expect(within(service).getByText('Category', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Package');
    expect(within(service).getByText('Division', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Travel');
    expect(within(section('Travel')).getByText('Dubai')).toBeInTheDocument();
    expect(within(section('Travel')).queryByText('No travel details.')).not.toBeInTheDocument();

    await user.click(within(service).getByRole('button', { name: 'Edit Service' }));
    await user.click(within(service).getByRole('button', { name: 'Save' }));
    expect(within(service).getByText('Choose Domestic or International.')).toBeInTheDocument();
    expect(await readDoc('bookings/b1')).not.toHaveProperty('tripScope');

    await user.click(within(service).getByRole('button', { name: 'International' }));
    await user.click(within(service).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await readDoc('bookings/b1')).toMatchObject({ tripScope: 'International' }));
    expect(within(service).getByText('Trip scope', { selector: 'dt' }).nextElementSibling).toHaveTextContent('International');
  });

  it('warns before saving the Service section when DMC payments lose their service tag', async () => {
    await seed(env, {
      'bookings/b1': { ...BOOKING, dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-10-02', amount: 5_000, mode: 'UPI', dmcId: 'd1', lineId: 'l1' }] },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const service = await screen.findByRole('region', { name: 'Service' });
    await user.click(within(service).getByRole('button', { name: 'Edit Service' }));
    expect(within(service).queryByText(/tagged to a changed service/)).not.toBeInTheDocument();
    await user.selectOptions(within(within(service).getByRole('listitem', { name: 'Line 1' })).getByLabelText('DMC'), 'Gulf Transfers');
    expect(within(service).getByText('1 DMC payment tagged to a changed service will stay with the old DMC, untagged.')).toBeInTheDocument();
  });

  it('shows In-house and per-line Received and Paid / owed in the Service table', async () => {
    await seed(env, {
      'bookings/b1': {
        ...BOOKING,
        lines: [{ id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000 }, { id: 'l2', type: 'Other', description: 'Own pickup', netCost: 0 }],
        clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-10-01', amount: 30_000, mode: 'UPI', lineId: 'l1' }],
        dmcPayments: [{ id: 'q1', kind: 'Payment', date: '2026-10-02', amount: 20_000, mode: 'UPI', dmcId: 'd1', lineId: 'l1' }],
      },
    });
    await renderAdmin('/admin/bookings/UDN-001');
    const service = await screen.findByRole('region', { name: 'Service' });
    expect(within(service).getByRole('columnheader', { name: 'Received' })).toBeInTheDocument();
    expect(within(service).getByRole('columnheader', { name: 'Paid / owed' })).toBeInTheDocument();
    const rows = within(service).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('₹30,000');
    expect(rows[1]).toHaveTextContent('₹20,000 / ₹70,000');
    expect(rows[2]).toHaveTextContent('In-house');
    expect(within(rows[2]).getByText('—')).toBeInTheDocument();
  });
});

describe('Delete line warning', () => {
  it('warns that tagged payments stay on the booking, untagged', async () => {
    await seed(env, {
      'bookings/b1': { ...BOOKING, clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-10-01', amount: 30_000, mode: 'UPI', lineId: 'l1' }] },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const service = await screen.findByRole('region', { name: 'Service' });
    await user.click(within(service).getByRole('button', { name: 'Edit Service' }));
    await user.click(within(within(service).getByRole('listitem', { name: 'Line 2' })).getByRole('button', { name: /Delete/ }));
    expect(within(await screen.findByRole('dialog')).queryByText(/Payments tagged to this service/)).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await user.click(within(within(service).getByRole('listitem', { name: 'Line 1' })).getByRole('button', { name: /Delete/ }));
    expect(within(await screen.findByRole('dialog')).getByText('Payments tagged to this service will stay on the booking, untagged.')).toBeInTheDocument();
  });
});

describe('Category flows', () => {
  it('creates a Visa booking without Travel, then converts it to a Package', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new');
    await screen.findByRole('region', { name: 'Customer' });
    await pickAsha(user);

    // Empty Category blocks Create.
    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(within(section('Service')).getByText('Choose a category.')).toBeInTheDocument();

    expect(screen.getByRole('region', { name: 'Travellers' })).toBeInTheDocument();
    await pickCategory(user, 'Visa');
    const service = section('Service');
    expect(within(service).getByText('Immigration')).toBeInTheDocument();
    expect(within(service).queryByLabelText('Type')).not.toBeInTheDocument();
    await user.selectOptions(within(service).getByLabelText('Visa type'), 'Visitor');
    await user.type(within(service).getByLabelText('Country'), 'UAE');
    await user.type(within(service).getByLabelText('Description'), 'UAE visitor visa');
    await typeMoney(user, within(service).getByLabelText('Net cost'), '5000');
    expect(within(service).getByLabelText('DMC')).toHaveDisplayValue('In-house');
    await user.type(within(section('Travellers')).getByLabelText('Traveller names'), 'Asha Patel{Enter}');
    expect(screen.queryByRole('region', { name: 'Travel' })).not.toBeInTheDocument(); // Visa: no Travel section
    await typeMoney(user, within(section('Price')).getByLabelText('Selling price'), '8000');
    await user.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' });
    const detail = section('Service');
    expect(within(detail).getByText('Category', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Visa');
    expect(within(detail).getByText('Division', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Immigration');
    expect(within(detail).getByText('In-house')).toBeInTheDocument();
    const documents = within(screen.getByRole('region', { name: 'Documents' }));
    expect(documents.getByRole('listitem', { name: 'Invoice' })).toBeInTheDocument();
    expect(documents.queryByRole('listitem', { name: 'Voucher' })).not.toBeInTheDocument();
    const created = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')!;
    expect(created).toMatchObject({
      category: 'Visa',
      hasTravel: false,
      travellerNames: ['Asha Patel'],
      lines: [expect.objectContaining({ type: 'Visa', visaType: 'Visitor', visaCountry: 'UAE', netCost: 5000 })],
    });
    expect(created).not.toHaveProperty('tripScope');
    expect(created).not.toHaveProperty('travelStart');

    // Add more service → Package.
    await user.click(within(detail).getByRole('button', { name: 'Edit Service' }));
    await user.click(within(detail).getByRole('button', { name: 'Add more service' }));
    await user.click(within(detail).getByRole('button', { name: 'Domestic' }));
    await user.type(within(within(detail).getByRole('listitem', { name: 'Line 2' })).getByLabelText('Description'), 'Hotel in Dubai');
    await user.click(within(detail).getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      const stored = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')!;
      expect(stored).toMatchObject({ category: 'Package', tripScope: 'Domestic' });
      expect(stored.lines).toHaveLength(2);
      expect((stored.lines as { type: string }[])[0].type).toBe('Visa');
    });
    // Package → Travel section appears (no details yet); Travellers stays.
    expect(within(section('Travel')).getByText('No travel details.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Travellers' })).toBeInTheDocument();
  });

  it('switching a saved Hotel booking to Visa clears its travel details; Pay DMC by only shows with a DMC', async () => {
    await seed(env, {
      'bookings/b1': {
        ...BOOKING,
        category: 'Hotel',
        hasTravel: true,
        travellerNames: [],
        lines: [{ id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000, dmcPayBy: '2026-11-20' }],
      },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const service = await screen.findByRole('region', { name: 'Service' });
    await user.click(within(service).getByRole('button', { name: 'Edit Service' }));
    expect(within(service).getByLabelText('Pay DMC by')).toHaveValue('2026-11-20');
    await user.selectOptions(within(service).getByLabelText('DMC'), 'In-house');
    expect(within(service).queryByLabelText('Pay DMC by')).not.toBeInTheDocument();
    await user.selectOptions(within(service).getByLabelText('DMC'), 'Desert Tours');

    await pickCategory(user, 'Visa');
    await user.selectOptions(within(service).getByLabelText('Visa type'), 'Visitor');
    await user.type(within(service).getByLabelText('Country'), 'UAE');
    await user.click(within(service).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await readDoc('bookings/b1')).toMatchObject({ category: 'Visa', hasTravel: false, destination: '', travellerNames: [] }));
    const stored = await readDoc('bookings/b1');
    expect(stored).not.toHaveProperty('travelStart');
    expect(stored).not.toHaveProperty('travelEnd');
    expect(screen.queryByRole('region', { name: 'Travel' })).not.toBeInTheDocument();
  });

  it('Contact person: optional section, saved with a normalised number', async () => {
    await seed(env, { 'bookings/b1': { ...BOOKING } });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const contact = await screen.findByRole('region', { name: 'Contact person' });
    expect(within(contact).getByText('No contact person.')).toBeInTheDocument();
    await user.click(within(contact).getByRole('button', { name: 'Edit Contact person' }));
    await user.type(within(contact).getByLabelText('Contact name'), 'Mehul Shah');
    await user.type(within(contact).getByLabelText('Contact number'), '12');
    await user.click(within(contact).getByRole('button', { name: 'Save' }));
    expect(within(contact).getByText('Enter a number in +91… format.')).toBeInTheDocument();
    await user.clear(within(contact).getByLabelText('Contact number'));
    await user.type(within(contact).getByLabelText('Contact number'), '98250 11224');
    await user.click(within(contact).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await readDoc('bookings/b1')).toMatchObject({ contactName: 'Mehul Shah', contactPhone: '+919825011224' }));
    expect(await within(contact).findByText('Mehul Shah')).toBeInTheDocument();
  });

  it('Travel is hidden until Add travel details', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new');
    await screen.findByRole('region', { name: 'Customer' });
    await pickAsha(user);
    await pickCategory(user, 'Hotel');
    await user.type(within(section('Service')).getByLabelText('Description'), 'Beach resort 3N');

    const travel = section('Travel');
    expect(within(travel).getByText('No travel details.')).toBeInTheDocument();
    expect(within(travel).queryByLabelText('Destination')).not.toBeInTheDocument();
    await user.click(within(travel).getByRole('button', { name: 'Add travel details' }));
    expect(within(travel).getByLabelText('Destination')).toBeInTheDocument();
    await user.click(within(travel).getByRole('button', { name: 'Remove travel details' }));
    expect(within(travel).queryByLabelText('Destination')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create booking' }));
    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' });
    const stored = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')!;
    expect(stored).toMatchObject({ category: 'Hotel', hasTravel: false });
    expect(stored).not.toHaveProperty('travelStart');
    expect(stored).not.toHaveProperty('travelEnd');
    expect(within(section('Travel')).getByRole('button', { name: 'Add travel details' })).toBeInTheDocument();
  });
});

describe('Payments', () => {
  it('add, edit and delete a Customer Payment update the Money rail; DMC entries go against a line DMC', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const payments = await screen.findByRole('region', { name: 'Customer payments' });
    expect(money('Customer outstanding')).toBe('₹1,50,000');
    expect(within(payments).getByText('No entries yet. Use Add entry to record a payment.')).toBeInTheDocument();

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
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹1,00,000'));
    expect(within(payments).getByText('UTR123')).toBeInTheDocument();

    // Edit (pencil, same row).
    await user.click(within(payments).getByRole('button', { name: /^Edit payment of ₹50,000/ }));
    const edit = within(payments).getByRole('group', { name: 'Edit entry' });
    await typeMoney(user, within(edit).getByLabelText('Amount'), '60000');
    await user.click(within(edit).getByRole('button', { name: 'Save entry' }));
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹90,000'));

    // A Refund shows as −₹X and nets off.
    await user.click(within(payments).getByRole('button', { name: 'Add entry' }));
    const refund = within(payments).getByRole('group', { name: 'New entry' });
    await user.selectOptions(within(refund).getByLabelText('Kind'), 'Refund');
    await typeMoney(user, within(refund).getByLabelText('Amount'), '5000');
    await user.click(within(refund).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹95,000'));
    expect(within(payments).getByText('−₹5,000')).toBeInTheDocument();

    // Delete (confirm).
    await user.click(within(payments).getByRole('button', { name: /^Delete payment of ₹60,000/ }));
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹1,55,000'));
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

  it('tags a Customer Payment to a service and lists it', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const payments = await screen.findByRole('region', { name: 'Customer payments' });
    await user.click(within(payments).getByRole('button', { name: 'Add entry' }));
    const row = within(payments).getByRole('group', { name: 'New entry' });
    const picker = within(row).getByLabelText('Service');
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual(['Whole booking', 'Hotel — Atlantis 4N', 'Transfer — Airport transfers']);
    await user.selectOptions(picker, 'Hotel — Atlantis 4N');
    await typeMoney(user, within(row).getByLabelText('Amount'), '30000');
    await user.click(within(row).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹1,20,000'));
    expect((await readDoc('bookings/b1'))?.clientPayments).toEqual([expect.objectContaining({ amount: 30_000, lineId: 'l1' })]);
    expect(within(payments).getByRole('columnheader', { name: 'Service' })).toBeInTheDocument();
    expect(within(payments).getByText('Hotel — Atlantis 4N')).toBeInTheDocument();

    // An untagged entry reads "Whole booking" and stores no lineId.
    await user.click(within(payments).getByRole('button', { name: 'Add entry' }));
    const whole = within(payments).getByRole('group', { name: 'New entry' });
    expect(within(whole).getByLabelText('Service')).toHaveDisplayValue('Whole booking');
    await typeMoney(user, within(whole).getByLabelText('Amount'), '1000');
    await user.click(within(whole).getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(money('Customer outstanding')).toBe('₹1,19,000'));
    expect(within(payments).getByText('Whole booking')).toBeInTheDocument();
    const stored = (await readDoc('bookings/b1'))?.clientPayments as Record<string, unknown>[];
    expect(stored.find((p) => p.amount === 1000)).not.toHaveProperty('lineId');
  });

  it("DMC entry lists only that DMC's services; in-house-only booking disables DMC Add entry", async () => {
    await seed(env, {
      'bookings/b1': {
        ...BOOKING,
        lines: [
          ...BOOKING.lines,
          { id: 'l3', type: 'Sightseeing', dmcId: 'd1', description: 'Desert safari', netCost: 5_000 },
        ],
      },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    const dmc = await screen.findByRole('region', { name: 'DMC payments' });
    await user.click(within(dmc).getByRole('button', { name: 'Add entry' }));
    const row = within(dmc).getByRole('group', { name: 'New entry' });
    const options = () => within(within(row).getByLabelText('Service')).getAllByRole('option').map((o) => o.textContent);
    expect(options()).toEqual(['Whole booking', 'Hotel — Atlantis 4N', 'Sightseeing — Desert safari']);
    await user.selectOptions(within(row).getByLabelText('Service'), 'Sightseeing — Desert safari');
    await user.selectOptions(within(row).getByLabelText('DMC'), 'Gulf Transfers');
    expect(within(row).getByLabelText('Service')).toHaveDisplayValue('Whole booking');
    expect(options()).toEqual(['Whole booking', 'Transfer — Airport transfers']);
    await user.selectOptions(within(row).getByLabelText('Service'), 'Transfer — Airport transfers');
    await typeMoney(user, within(row).getByLabelText('Amount'), '4000');
    await user.click(within(row).getByRole('button', { name: 'Add entry' }));
    await waitFor(async () => expect((await readDoc('bookings/b1'))?.dmcPayments).toEqual([expect.objectContaining({ dmcId: 'd2', lineId: 'l2', amount: 4000 })]));
    expect(within(dmc).getByText('Transfer — Airport transfers')).toBeInTheDocument();
  });

  it('disables DMC Add entry when every line is in-house', async () => {
    await seed(env, {
      'bookings/b1': { ...BOOKING, lines: [{ id: 'l1', type: 'Other', description: 'Own pickup', netCost: 0 }] },
    });
    await renderAdmin('/admin/bookings/UDN-001');
    const dmc = await screen.findByRole('region', { name: 'DMC payments' });
    expect(within(dmc).getByRole('button', { name: 'Add entry' })).toBeDisabled();
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

    await typeMoney(user, within(dialog).getByLabelText('Customer cancellation charge'), '20000');
    await typeMoney(user, within(dialog).getByLabelText('Cancellation charge for Hotel, Desert Tours'), '10000');
    expect(preview).toHaveTextContent('Commission becomes₹10,000');
    expect(preview).toHaveTextContent('Refund owed ₹30,000');
    expect(preview).toHaveTextContent('Due back ₹30,000');

    // Reason is required.
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    expect(within(dialog).getByText('Enter a reason.')).toBeInTheDocument();
    expect((await readDoc('bookings/b1'))?.status).toBe('Confirmed');

    await user.type(within(dialog).getByLabelText('Reason'), 'Customer medical emergency');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    expect(await screen.findByText(`Cancelled ${formatDate(todayIST())}: Customer medical emergency`)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(money('Customer cancellation charge')).toBe('₹20,000');
    expect(money('Commission')).toBe('₹10,000');
    expect(money('Customer outstanding')).toBe('Refund ₹30,000');
    expect(money('DMC outstanding')).toBe('Due back ₹30,000');
    expect(await readDoc('bookings/b1')).toMatchObject({
      status: 'Cancelled',
      cancelledAt: todayIST(),
      cancelReason: 'Customer medical emergency',
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

describe('Status and cancellation (in-house)', () => {
  it('labels a DMC-less line In-house in the Cancel dialog', async () => {
    await seed(env, {
      'bookings/b1': {
        ...BOOKING,
        status: 'Confirmed',
        lines: [{ id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000 }, { id: 'l2', type: 'Other', description: 'Own pickup', netCost: 0 }],
      },
    });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/UDN-001');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'Cancelled');
    const dialog = await screen.findByRole('dialog', { name: 'Cancel UDN-001?' });
    expect(within(dialog).getByText('Other, In-house')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Cancellation charge for Other, In-house')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Cancellation charge for Hotel, Desert Tours')).toBeInTheDocument();
  });
});

describe('Enquiry Convert', () => {
  /** The Visa Category is preset from the Enquiry; fill the line and a traveller. */
  async function fillVisa(user: UserEvent) {
    const service = section('Service');
    await user.selectOptions(within(service).getByLabelText('Visa type'), 'Visitor');
    await user.clear(within(service).getByLabelText('Country'));
    await user.type(within(service).getByLabelText('Country'), 'Dubai');
    await user.type(within(service).getByLabelText('Description'), 'Dubai visitor visa');
    await user.type(within(section('Travellers')).getByLabelText('Traveller names'), 'Asha Patel{Enter}');
  }

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

  it('matches the Customer by mobile, prefills, and converts the Enquiry in the same write', async () => {
    await seed(env, { 'inquiries/e1': enquiry() });
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/bookings/new?enquiry=e1');

    const client = await screen.findByRole('region', { name: 'Customer' });
    expect(within(client).getByText('Matched existing Customer Asha Patel by mobile +919811111111. Confirm or pick another.')).toBeInTheDocument();
    expect(within(client).getByRole('button', { name: 'Existing customer' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(client).getByRole('combobox', { name: 'Customer' })).toHaveValue('Asha Patel, +919811111111');
    expect(within(section('Service')).getByLabelText('Category')).toHaveValue('Visa'); // from the Enquiry's service
    // Visa: no Travel section; the Enquiry's destination prefills the Visa Country.
    expect(screen.queryByRole('region', { name: 'Travel' })).not.toBeInTheDocument();
    expect(within(section('Service')).getByLabelText('Country')).toHaveValue('Dubai');
    expect(within(section('Notes')).getByLabelText('Internal notes')).toHaveValue('From enquiry 20 Oct 2026: Visa Services — Dubai visa for two');

    await fillVisa(user);
    await user.click(screen.getByRole('button', { name: 'Create booking' }));

    expect(await screen.findByRole('heading', { level: 1, name: /UDN-002/ })).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Status' }); // detail loaded
    expect(router.state.location.pathname).toBe('/admin/bookings/UDN-002');
    expect(within(section('Notes')).getByRole('link', { name: /From enquiry/ })).toBeInTheDocument();

    const booking = (await readAll(env, 'bookings')).find((b) => b.bookingNo === 'UDN-002')!;
    expect(booking).toMatchObject({ clientId: 'c1', enquiryId: 'e1', hasTravel: false, status: 'Pending' });
    expect((booking.lines as { visaCountry?: string }[])[0].visaCountry).toBe('Dubai');
    expect(await readDoc('inquiries/e1')).toMatchObject({ status: 'converted', clientId: 'c1', bookingId: booking.id });
    expect(await readAll(env, 'clients')).toHaveLength(1);
  });

  it('without a mobile match, prefills a new Customer that is created with the Booking', async () => {
    await seed(env, { 'inquiries/e2': enquiry({ name: 'Neha Shah', phone: '+919833333333' }) });
    const user = userEvent.setup();
    await renderAdmin('/admin/bookings/new?enquiry=e2');

    const client = await screen.findByRole('region', { name: 'Customer' });
    expect(within(client).getByText('No Customer with mobile +919833333333. A new Customer will be created.')).toBeInTheDocument();
    expect(within(client).getByRole('button', { name: 'New customer' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(client).getByLabelText('Name')).toHaveValue('Neha Shah');
    expect(within(client).getByLabelText('Mobile')).toHaveValue('+919833333333');

    await fillVisa(user);
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
