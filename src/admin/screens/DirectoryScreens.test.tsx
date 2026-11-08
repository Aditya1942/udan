/**
 * Seam 5: Clients, DMCs, Enquiries and Settings against the Auth + Firestore emulators with the real rules,
 * plus the four data-region states (loading / empty / error / full) on the Clients and Enquiries lists.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_EMAIL, googleDb, seed, seedAdmins } from '../../test/adminAuth';
import { clearFirestore, contextDb, createRulesEnv } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { AdminDataProvider } from '../data';
import { LAST_BACKUP_KEY } from '../export';
import { formatDate, todayIST } from '../model';
import { ToastProvider } from '../ui';
import { ClientsScreen } from './ClientsScreen';
import { EnquiriesScreen } from './EnquiriesScreen';

const PROJECT_ID = 'demo-udan-admin-directory';
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
    { id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000 },
    { id: 'l2', type: 'Transfer', dmcId: 'd2', description: 'Airport transfers', netCost: 10_000 },
  ],
  clientPayments: [{ id: 'p1', kind: 'Payment', date: '2026-10-05', amount: 50_000, mode: 'UPI', ref: 'UTR9' }],
  dmcPayments: [{ id: 'p2', kind: 'Payment', date: '2026-10-06', amount: 10_000, mode: 'Bank transfer', dmcId: 'd2' }],
  createdAt: now,
  updatedAt: now,
};
const enquiry = (o: Record<string, unknown>) => ({
  phone: '+919822222222',
  service: 'visa-services',
  message: 'Dubai visa for two',
  sourcePage: '/contact',
  destination: 'Dubai',
  status: 'new',
  createdAt: new Date('2026-10-20T06:00:00Z'),
  ...o,
});

async function readDoc(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(contextDb(ctx), path))).data();
  });
  return data;
}
const eventually = (fn: () => Promise<void>) => waitFor(fn, { timeout: 5000 });

async function renderAdmin(path: string) {
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-owner', email: ADMIN_EMAIL, email_verified: true })));
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeAll(async () => {
  if (!AUTH_HOST) throw new Error('Auth emulator not running. Use `npm test` or `npm run emulators`.');
  env = await createRulesEnv(PROJECT_ID);
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  localStorage.clear();
  await clearFirestore(env);
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await seedAdmins(env);
  await seed(env, {
    'clients/c1': { name: 'Asha Patel', mobile: '+919811111111', city: 'Surat', email: 'asha@example.com', createdAt: now, updatedAt: now },
    'clients/c2': { name: 'Ravi Mehta', mobile: '+919833333333', createdAt: now, updatedAt: now },
    'dmcs/d1': { name: 'Desert Tours', region: 'UAE', contactPerson: 'Omar', phone: '+971501234567', createdAt: now, updatedAt: now },
    'dmcs/d2': { name: 'Gulf Transfers', createdAt: now, updatedAt: now },
    'dmcs/d3': { name: 'Kerala Trails', region: 'Kerala', createdAt: now, updatedAt: now },
    'counters/booking': { seq: 1 },
    'bookings/b1': BOOKING,
    'inquiries/e1': enquiry({ name: 'Neha Shah' }),
    'inquiries/e2': enquiry({ name: 'Vik Rao', phone: '+919844444444', status: 'contacted', createdAt: new Date('2026-10-18T06:00:00Z') }),
    'inquiries/e3': enquiry({ name: 'Asha Patel', phone: '+919811111111', status: 'converted', bookingId: 'b1', clientId: 'c1' }),
    'inquiries/e4': enquiry({ name: 'Spam Bot', status: 'closed', closeReason: 'Spam', createdAt: new Date('2026-10-01T06:00:00Z') }),
  });
  app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `directory-${++appCount}`);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const { host, port } = env.emulators.firestore!;
  connectFirestoreEmulator(db, host, port);
});
afterEach(async () => {
  // Unmount (stop the app's listeners) before deleting the app; setup.ts's cleanup runs after this hook.
  cleanup();
  vi.restoreAllMocks();
  await deleteApp(app);
});

describe('Customers', () => {
  it('lists Customers with Bookings, Billed and Outstanding; search narrows; New customer checks mobile uniqueness', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/customers');

    const asha = await screen.findByRole('row', { name: /Asha Patel/ });
    expect(within(asha).getByText('asha@example.com')).toBeInTheDocument();
    expect(within(asha).getAllByRole('cell').map((c) => c.textContent)).toEqual(['+919811111111', 'Surat', '1', '₹1,50,000', '₹1,00,000']);

    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'ravi');
    expect(screen.queryByRole('row', { name: /Asha Patel/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Ravi Mehta/ })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=ravi');

    await user.click(screen.getByRole('button', { name: 'New customer' }));
    const dialog = screen.getByRole('dialog', { name: 'New customer' });
    await user.type(within(dialog).getByLabelText('Name'), 'Meera Iyer');
    await user.type(within(dialog).getByLabelText('Mobile'), '98111 11111');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(within(dialog).getByText('Asha Patel already has this mobile.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Mobile'));
    await user.type(within(dialog).getByLabelText('Mobile'), '9855555555');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Meera Iyer' })).toBeInTheDocument();
    const id = router.state.location.pathname.split('/').pop()!;
    expect(await readDoc(`clients/${id}`)).toMatchObject({ name: 'Meera Iyer', mobile: '+919855555555' });
  });

  it('New customer saves optional address, WhatsApp, emergency contact, GST and PAN; validates GST and PAN', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/customers');
    await user.click(await screen.findByRole('button', { name: 'New customer' }));
    const dialog = screen.getByRole('dialog', { name: 'New customer' });
    const field = (label: string) => within(dialog).getByLabelText(label);

    await user.type(field('Name'), 'Meera Iyer');
    await user.type(field('Mobile'), '9855555555');
    expect(field('Same as mobile')).toBeChecked();
    expect(field('WhatsApp')).toBeDisabled();
    await user.click(field('Same as mobile'));
    await user.type(field('WhatsApp'), '98666 66666');
    await user.type(field('Address'), '12 Park Road, Navrangpura');
    await user.type(field('City'), 'Ahmedabad');
    await user.type(field('State'), 'Gujarat');
    await user.type(field('Country'), 'India');
    await user.type(field('Emergency contact name'), 'Ravi Iyer');
    await user.type(field('Emergency contact phone'), '9877777777');
    await user.type(field('GST number'), '24abc');
    await user.type(field('PAN number'), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(within(dialog).getByText('Enter a 15-character GSTIN, e.g. 24ABCDE1234F1Z5.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a 10-character PAN, e.g. ABCDE1234F.')).toBeInTheDocument();

    await user.clear(field('GST number'));
    await user.type(field('GST number'), '24abcde1234f1z5');
    await user.clear(field('PAN number'));
    await user.type(field('PAN number'), 'abcde1234f');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Meera Iyer' })).toBeInTheDocument();
    const id = router.state.location.pathname.split('/').pop()!;
    const saved = await readDoc(`clients/${id}`);
    expect(saved).toMatchObject({
      whatsapp: '+919866666666',
      address: '12 Park Road, Navrangpura',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      emergencyName: 'Ravi Iyer',
      emergencyPhone: '+919877777777',
      gstin: '24ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
    });
    expect(saved).not.toHaveProperty('whatsappSameAsMobile');
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('919866666666'));
  });

  it('Customer page: strip, Bookings, New booking prefilled, inline Edit/Save, delete blocked while used', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/customers/c1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Asha Patel' })).toBeInTheDocument();
    const strip = screen.getByLabelText('Customer totals (Pending excluded)');
    expect(within(strip).getByText('Billed').nextElementSibling).toHaveTextContent('₹1,50,000');
    expect(within(strip).getByText('Outstanding').nextElementSibling).toHaveTextContent('₹1,00,000');
    expect(screen.getByRole('link', { name: 'UDN-001' })).toHaveAttribute('href', '/admin/bookings/UDN-001');
    expect(screen.getAllByRole('link', { name: 'New booking' }).at(-1)).toHaveAttribute('href', '/admin/bookings/new?client=c1');
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/919811111111');

    const details = screen.getByRole('region', { name: 'Details' });
    expect(within(details).getByRole('button', { name: 'Delete customer' })).toBeDisabled();
    expect(within(details).getByText("Used in 1 booking, so it can't be deleted.")).toBeInTheDocument();

    await user.click(within(details).getByRole('button', { name: 'Edit' }));
    await user.clear(within(details).getByLabelText('Mobile'));
    await user.type(within(details).getByLabelText('Mobile'), '+919833333333');
    await user.click(within(details).getByRole('button', { name: 'Save' }));
    expect(within(details).getByText('Ravi Mehta already has this mobile.')).toBeInTheDocument();

    await user.clear(within(details).getByLabelText('Mobile'));
    await user.type(within(details).getByLabelText('Mobile'), '+919811111111');
    await user.clear(within(details).getByLabelText('City'));
    await user.type(within(details).getByLabelText('City'), 'Vadodara');
    await user.clear(within(details).getByLabelText('Email'));
    await user.click(within(details).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(details).queryByLabelText('City')).not.toBeInTheDocument());
    expect(within(details).getByText('Vadodara')).toBeInTheDocument();
    const stored = await readDoc('clients/c1');
    expect(stored).toMatchObject({ city: 'Vadodara', mobile: '+919811111111' });
    expect(stored).not.toHaveProperty('email');
  });

  it('Customer page Travel column shows entered dates only, never the createdAt fallback', async () => {
    const { travelStart: _s, travelEnd: _e, ...undated } = BOOKING;
    await seed(env, { 'bookings/b1': { ...undated, hasTravel: false, destination: '' } });
    await renderAdmin('/admin/customers/c1');
    const row = (await screen.findByRole('link', { name: 'UDN-001' })).closest('tr')!;
    expect(within(row).getByText('UDN-001')).toBeInTheDocument();
    expect(row).not.toHaveTextContent(/\d{4}/);
  });

  it('New booking from a Customer page starts with that Customer picked', async () => {
    await renderAdmin('/admin/bookings/new?client=c2');
    const client = await screen.findByRole('region', { name: 'Customer' });
    expect(within(client).getByRole('combobox', { name: 'Customer' })).toHaveValue('Ravi Mehta, +919833333333');
  });

  it('deletes an unused Customer after confirm', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/customers/c2');
    const details = await screen.findByRole('region', { name: 'Details' });
    await user.click(within(details).getByRole('button', { name: 'Delete customer' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete Ravi Mehta?' })).getByRole('button', { name: 'Delete customer' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/customers'));
    expect(await readDoc('clients/c2')).toBeUndefined();
  });
});

describe('DMCs', () => {
  it('lists what you owe each DMC; "Only with money owed" filters', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/dmcs');

    const desert = await screen.findByRole('row', { name: /Desert Tours/ });
    expect(within(desert).getAllByRole('cell').map((c) => c.textContent)).toEqual(['UAE', 'Omar+971501234567', '1', '₹90,000', '₹90,000', 'None']);
    expect(within(screen.getByRole('row', { name: /Gulf Transfers/ })).getAllByRole('cell')[4]).toHaveTextContent('₹0');
    expect(screen.getByRole('row', { name: /Kerala Trails/ })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Only with money owed' }));
    expect(router.state.location.search).toBe('?owing=1');
    expect(screen.queryByRole('row', { name: /Kerala Trails/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Gulf Transfers/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Desert Tours/ })).toBeInTheDocument();
  });

  it('DMC page lists its Bookings with cost, paid and outstanding; head Edit saves; delete blocked while used', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/dmcs/d2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Gulf Transfers' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /UDN-001/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Asha Patel1 Dec 2026 – 5 Dec 2026',
      'Transfer',
      'Confirmed',
      'None',
      '₹10,000',
      '₹10,000',
      '₹0',
    ]);
    const details = screen.getByRole('region', { name: 'Details' });
    expect(within(details).getByRole('button', { name: 'Delete DMC' })).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]); // head
    await user.type(within(details).getByLabelText('Region'), 'Dubai');
    await user.click(within(details).getByRole('button', { name: 'Save' }));
    await eventually(async () => expect(await readDoc('dmcs/d2')).toMatchObject({ region: 'Dubai' }));
  });

  it('deletes an unused DMC after confirm', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/dmcs/d3');
    const details = await screen.findByRole('region', { name: 'Details' });
    await user.click(within(details).getByRole('button', { name: 'Delete DMC' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete Kerala Trails?' })).getByRole('button', { name: 'Delete DMC' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/dmcs'));
    expect(await readDoc('dmcs/d3')).toBeUndefined();
  });
});

describe('Enquiries', () => {
  const row = (name: string) => screen.getByRole('listitem', { name });
  const statusFilter = () => screen.getByRole('group', { name: 'Status' });

  it('defaults to Open with counts per status; the filter is kept in ?filter=', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/enquiries');

    await screen.findByRole('listitem', { name: 'Neha Shah' });
    const list = screen.getByRole('list', { name: 'Enquiries' });
    expect(within(list).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['Neha Shah', 'Vik Rao']); // newest first
    expect(within(statusFilter()).getByRole('button', { name: 'Open 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(statusFilter()).getByRole('button', { name: 'All 4' })).toBeInTheDocument();
    // Nav badge = live count of New.
    expect(screen.getAllByLabelText('1 new').length).toBeGreaterThan(0);

    const neha = row('Neha Shah');
    expect(within(neha).getByText(/\+919822222222, Visa Services, Dubai, received 20 Oct 2026, from \/contact/)).toBeInTheDocument();
    expect(within(neha).getByRole('link', { name: 'Convert' })).toHaveAttribute('href', '/admin/bookings/new?enquiry=e1');
    expect(within(neha).getByRole('link', { name: 'Call Neha Shah' })).toHaveAttribute('href', 'tel:+919822222222');
    expect(within(neha).getByRole('link', { name: 'WhatsApp Neha Shah' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919822222222\?text=Hi%20Neha/);

    await user.click(within(statusFilter()).getByRole('button', { name: 'Closed 1' }));
    expect(router.state.location.search).toBe('?filter=closed');
    expect(within(row('Spam Bot')).getByText('Closed: Spam')).toBeInTheDocument();
  });

  it('a converted Enquiry shows only "View UDN-xxx" (no Convert, no delete)', async () => {
    await renderAdmin('/admin/enquiries?filter=converted');
    const asha = await screen.findByRole('listitem', { name: 'Asha Patel' });
    await waitFor(() => expect(within(asha).getByRole('link', { name: 'View UDN-001' })).toHaveAttribute('href', '/admin/bookings/UDN-001'));
    expect(within(asha).queryByRole('link', { name: 'Convert' })).not.toBeInTheDocument();
    expect(within(asha).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(within(asha).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('Mark contacted, Close with a reason, Reopen; notes save on blur', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/enquiries?filter=all');

    const neha = await screen.findByRole('listitem', { name: 'Neha Shah' });
    await user.click(within(neha).getByRole('button', { name: 'Mark contacted' }));
    await eventually(async () => expect((await readDoc('inquiries/e1'))?.status).toBe('contacted'));
    await waitFor(() => expect(within(neha).queryByRole('button', { name: 'Mark contacted' })).not.toBeInTheDocument());
    expect(within(neha).getByText('Contacted')).toBeInTheDocument();

    await user.click(within(neha).getByRole('button', { name: 'Close' }));
    const dialog = screen.getByRole('dialog', { name: 'Close enquiry from Neha Shah?' });
    await user.type(within(dialog).getByLabelText('Reason'), 'Booked elsewhere');
    await user.click(within(dialog).getByRole('button', { name: 'Close enquiry' }));
    await eventually(async () => expect(await readDoc('inquiries/e1')).toMatchObject({ status: 'closed', closeReason: 'Booked elsewhere' }));
    expect(await within(neha).findByText('Closed: Booked elsewhere')).toBeInTheDocument();

    await user.click(within(neha).getByRole('button', { name: 'Reopen' }));
    await eventually(async () => expect((await readDoc('inquiries/e1'))?.status).toBe('contacted'));
    expect(await readDoc('inquiries/e1')).not.toHaveProperty('closeReason');

    await user.click(within(neha).getByText('Add a note'));
    await user.type(within(neha).getByLabelText('Admin notes for Neha Shah'), 'Call back Monday');
    await user.tab();
    await eventually(async () => expect((await readDoc('inquiries/e1'))?.adminNotes).toBe('Call back Monday'));
  });

  it('deletes a spam Enquiry after confirm', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/enquiries?filter=closed');
    const spam = await screen.findByRole('listitem', { name: 'Spam Bot' });
    await user.click(within(spam).getByRole('button', { name: 'Delete enquiry from Spam Bot as spam' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this enquiry?' })).getByRole('button', { name: 'Delete enquiry' }));
    await eventually(async () => expect(await readDoc('inquiries/e4')).toBeUndefined());
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Spam Bot' })).not.toBeInTheDocument());
    expect(screen.getByText('No closed enquiries')).toBeInTheDocument();
  });
});

describe('Settings', () => {
  /** Captures what `downloadText` hands to the browser. */
  function captureDownloads() {
    const files: { name: string; blob: Blob }[] = [];
    let last: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      last = blob;
      return 'blob:test';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      files.push({ name: this.download, blob: last! });
    });
    return files;
  }

  /** UTF-8 decode keeping the BOM (Blob.text() strips it). */
  const text = async (blob: Blob) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer());

  it('seeds the Business profile, saves the whole form with one Save, and discards edits', async () => {
    const user = userEvent.setup();
    await renderAdmin('/admin/settings');

    const tradingName = await screen.findByLabelText('Trading name');
    expect(tradingName).toHaveValue('UDAN Immigration & Tours');
    await eventually(async () => expect((await readDoc('settings/business'))?.tradingName).toBe('UDAN Immigration & Tours'));
    const save = screen.getByRole('button', { name: 'Save profile' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('UPI ID'), 'udan@okaxis');
    await user.type(screen.getByLabelText('IFSC'), 'HDFC0001234');
    await user.type(screen.getByLabelText('Invoice terms'), '50% advance.');
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument();
    await user.click(save);
    await eventually(async () =>
      expect(await readDoc('settings/business')).toMatchObject({ upiId: 'udan@okaxis', ifsc: 'HDFC0001234', invoiceTerms: '50% advance.' }),
    );
    expect(await screen.findByText('One save for the whole profile.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Trading name'));
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByLabelText('Trading name')).toHaveValue('UDAN Immigration & Tours');
  });

  it('downloads a Backup of all six collections and remembers it on this device', async () => {
    const files = captureDownloads();
    const user = userEvent.setup();
    await renderAdmin('/admin/settings');

    expect(await screen.findByText('Last backup on this device: never')).toBeInTheDocument();
    expect(screen.getByText(/No backup has been taken on this device yet/)).toBeInTheDocument();
    await screen.findByLabelText('Trading name'); // profile seeded → settings/business exists
    await user.click(screen.getByRole('button', { name: 'Download backup' }));

    expect(await screen.findByText(`Last backup on this device: ${formatDate(todayIST())}`)).toBeInTheDocument();
    expect(localStorage.getItem(LAST_BACKUP_KEY)).toBe(todayIST());
    expect(screen.queryByText(/No backup has been taken/)).not.toBeInTheDocument();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe(`udan-backup-${todayIST()}.json`);
    const backup = JSON.parse(await files[0].blob.text());
    expect(backup).toMatchObject({ format: 'udan-admin-backup', version: 1, projectId: PROJECT_ID });
    expect(Object.keys(backup.collections).sort()).toEqual(['bookings', 'clients', 'counters', 'dmcs', 'inquiries', 'settings']);
    expect(backup.collections.clients.c1).toMatchObject({ name: 'Asha Patel', createdAt: now.toISOString() });
    expect(backup.collections.settings.business.tradingName).toBe('UDAN Immigration & Tours');
    expect(backup.collections.counters.booking).toEqual({ seq: 1 });
  });

  it('exports the Payments Ledger CSV for a custom range and side, and the Customers CSV', async () => {
    const files = captureDownloads();
    const user = userEvent.setup();
    await renderAdmin('/admin/settings');

    const ledger = await screen.findByRole('region', { name: 'Payments ledger' });
    await user.selectOptions(within(ledger).getByLabelText('Period'), 'Custom');
    fireEvent.change(within(ledger).getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(ledger).getByLabelText('To'), { target: { value: '2026-10-31' } });
    await waitFor(() => expect(within(ledger).getByText('2 entries, 1 Oct 2026 – 31 Oct 2026')).toBeInTheDocument());
    await user.selectOptions(within(ledger).getByLabelText('Side'), 'DMC');
    await user.click(within(ledger).getByRole('button', { name: 'Export payments CSV' }));

    expect(files[0].name).toBe('udan-payments-2026-10-01-2026-10-31.csv');
    const csv = await text(files[0].blob);
    expect(csv).toBe(
      '﻿Date,Booking ID,Booking status,Side,Party,Kind,Mode,Reference,Note,Amount,Signed amount\r\n' +
        '2026-10-06,UDN-001,Confirmed,DMC,Gulf Transfers,Payment,Bank transfer,,,10000,-10000\r\n',
    );

    await user.click(screen.getByRole('button', { name: 'Export Customers CSV' }));
    expect(files[1].name).toBe(`udan-customers-${todayIST()}.csv`);
    const clientsCsv = (await text(files[1].blob)).split('\r\n');
    expect(clientsCsv[0]).toBe('﻿Customer ID,Name,Mobile,WhatsApp,Email,Address,City,State,Country,Emergency contact name,Emergency contact phone,GST number,PAN number,Notes,Bookings,Created,Updated');
    expect(clientsCsv[1]).toMatch(/^c1,Asha Patel,'\+919811111111,,asha@example.com,,Surat,,,,,,,,1,/);
  });
});

describe('Data-region states (Customers and Enquiries lists)', () => {
  function renderScreen(screenEl: React.ReactNode, database: Firestore) {
    return render(
      <MemoryRouter>
        <AdminDataProvider db={database}>
          <ToastProvider>{screenEl}</ToastProvider>
        </AdminDataProvider>
      </MemoryRouter>,
    );
  }

  it('loading, then full', async () => {
    renderScreen(<ClientsScreen />, googleDb(env));
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /Asha Patel/ })).toBeInTheDocument();
  });

  it('empty: what goes here + one action', async () => {
    await clearFirestore(env);
    await seedAdmins(env);
    renderScreen(<ClientsScreen />, googleDb(env));
    expect(await screen.findByRole('heading', { name: 'No Customers yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New customer' })).toHaveLength(2);

    renderScreen(<EnquiriesScreen />, googleDb(env));
    expect(await screen.findByRole('heading', { name: 'No Enquiries yet' })).toBeInTheDocument();
  });

  it('error: what broke + Retry', async () => {
    const stranger = googleDb(env, { email: 'stranger@example.com' });
    renderScreen(<ClientsScreen />, stranger);
    expect(await screen.findByRole('heading', { name: "Couldn't load Customers" })).toBeInTheDocument();
    expect(screen.getByText("Your account doesn't have access to this data.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('error on Enquiries', async () => {
    renderScreen(<EnquiriesScreen />, googleDb(env, { email: 'stranger@example.com' }));
    expect(await screen.findByRole('heading', { name: "Couldn't load Enquiries" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
