/**
 * Seam 5: Dashboard Overview and Insights against the Auth + Firestore emulators with the real rules.
 * Overview: month stats and Needs attention from seeded data, calendar bars, table search / filters / sort kept in
 * the URL, footer totals, CSV, pre-filtered links, and the four data-region states. Insights: a smoke test of the
 * lazy route (KPIs, period, "View as table", top tables).
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_EMAIL, googleDb, seed, seedAdmins } from '../../test/adminAuth';
import { clearFirestore, createRulesEnv } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { AdminDataProvider } from '../data';
import { addDays, addMonths, formatDate, formatMonth, formatMonthShort, monthOf, todayIST } from '../model';
import { ToastProvider } from '../ui';
import { OverviewScreen } from './OverviewScreen';

const PROJECT_ID = 'demo-udan-admin-dashboard';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

let env: RulesTestEnvironment;
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let appCount = 0;

const now = new Date();
const today = todayIST();
const month = monthOf(today);
const prevMonth = addMonths(month, -1);
const twoMonthsAgo = addMonths(month, -2);

const booking = (o: Record<string, unknown>) => ({
  status: 'Confirmed',
  pax: { adults: 2, children: 0, infants: 0 },
  travellerNames: [],
  itinerary: '',
  internalNotes: '',
  lines: [],
  clientPayments: [],
  dmcPayments: [],
  createdAt: now,
  updatedAt: now,
  ...o,
});

/**
 * UDN-001 this month, Confirmed, ₹1,50,000 (Net Cost ₹1,00,000), ₹50,000 received, balance overdue.
 * UDN-002 this month, Pending (excluded from figures).
 * UDN-003 last month, Completed, fully paid.
 * UDN-004 two months ago, travel ended but still Confirmed; DMC pay-by in 3 days, unpaid.
 */
const BOOKINGS = {
  'bookings/b1': booking({
    bookingNo: 'UDN-001',
    bookingSeq: 1,
    clientId: 'c1',
    destination: 'Dubai',
    travelStart: `${month}-10`,
    travelEnd: `${month}-14`,
    sellingPrice: 150_000,
    clientBalanceDueBy: addDays(today, -3),
    lines: [
      { id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Atlantis 4N', netCost: 90_000 },
      { id: 'l2', type: 'Transfer', dmcId: 'd2', description: 'Airport transfers', netCost: 10_000 },
    ],
    clientPayments: [{ id: 'p1', kind: 'Payment', date: addDays(today, -20), amount: 50_000, mode: 'UPI' }],
  }),
  'bookings/b2': booking({
    bookingNo: 'UDN-002',
    bookingSeq: 2,
    clientId: 'c2',
    status: 'Pending',
    destination: 'Goa',
    travelStart: `${month}-20`,
    travelEnd: `${month}-22`,
    sellingPrice: 40_000,
    lines: [{ id: 'l3', type: 'Hotel', dmcId: 'd1', description: 'Beach resort', netCost: 30_000 }],
  }),
  'bookings/b3': booking({
    bookingNo: 'UDN-003',
    bookingSeq: 3,
    clientId: 'c2',
    status: 'Completed',
    destination: 'Kerala',
    travelStart: `${prevMonth}-05`,
    travelEnd: `${prevMonth}-09`,
    sellingPrice: 80_000,
    lines: [{ id: 'l4', type: 'Package', dmcId: 'd3', description: 'Backwaters', netCost: 60_000 }],
    clientPayments: [{ id: 'p2', kind: 'Payment', date: `${prevMonth}-01`, amount: 80_000, mode: 'UPI' }],
    dmcPayments: [{ id: 'p3', kind: 'Payment', date: `${prevMonth}-02`, amount: 60_000, mode: 'Bank transfer', dmcId: 'd3' }],
  }),
  'bookings/b4': booking({
    bookingNo: 'UDN-004',
    bookingSeq: 4,
    clientId: 'c1',
    destination: 'Bali',
    travelStart: `${twoMonthsAgo}-10`,
    travelEnd: `${twoMonthsAgo}-15`,
    sellingPrice: 60_000,
    lines: [{ id: 'l5', type: 'Hotel', dmcId: 'd1', description: 'Ubud villa', netCost: 45_000, dmcPayBy: addDays(today, 3) }],
    clientPayments: [{ id: 'p4', kind: 'Payment', date: addDays(today, -50), amount: 60_000, mode: 'UPI' }],
  }),
};

async function seedAll() {
  await seed(env, {
    'clients/c1': { name: 'Asha Patel', mobile: '+919811111111', createdAt: now, updatedAt: now },
    'clients/c2': { name: 'Ravi Mehta', mobile: '+919833333333', createdAt: now, updatedAt: now },
    'dmcs/d1': { name: 'Desert Tours', createdAt: now, updatedAt: now },
    'dmcs/d2': { name: 'Gulf Transfers', createdAt: now, updatedAt: now },
    'dmcs/d3': { name: 'Kerala Trails', createdAt: now, updatedAt: now },
    'counters/booking': { seq: 4 },
    ...BOOKINGS,
    'inquiries/e1': {
      name: 'Neha Shah',
      phone: '+919822222222',
      service: 'visa-services',
      message: 'Dubai visa for two',
      sourcePage: '/contact',
      status: 'new',
      createdAt: now,
    },
  });
}

async function renderAdmin(path: string) {
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'sub-owner', email: ADMIN_EMAIL, email_verified: true })));
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const params = (router: { state: { location: { search: string } } }) => new URLSearchParams(router.state.location.search);
/** Booking IDs of the table body rows, in order. */
const tableIds = () =>
  within(screen.getByRole('table', { name: /^Bookings/ }))
    .getAllByRole('rowheader')
    .map((h) => h.textContent ?? '')
    .filter((t) => t.startsWith('UDN-'));

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
const text = async (blob: Blob) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer());

beforeAll(async () => {
  if (!AUTH_HOST) throw new Error('Auth emulator not running. Use `npm test` or `npm run emulators`.');
  env = await createRulesEnv(PROJECT_ID);
  // Recharts' ResponsiveContainer needs ResizeObserver (jsdom has none).
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  localStorage.clear();
  await clearFirestore(env);
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await seedAdmins(env);
  await seedAll();
  app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `dashboard-${++appCount}`);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const { host, port } = env.emulators.firestore!;
  connectFirestoreEmulator(db, host, port);
});
afterEach(async () => {
  // Unmount (stop the app's listeners) before deleting the app.
  cleanup();
  vi.restoreAllMocks();
  await deleteApp(app);
});

describe('Overview', () => {
  it('shows the month figures, Needs attention (incl. Backup overdue) and the calendar bars; the month bar moves months in the URL', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin');

    const figures = await screen.findByLabelText(`${formatMonth(month)} figures`);
    await waitFor(() => expect(within(figures).getByText('₹1,50,000')).toBeInTheDocument());
    // Pending UDN-002 is left out: 1 Booking, Commission ₹50,000, outstanding ₹1,00,000.
    expect([...figures.querySelectorAll('dd')].map((d) => d.textContent)).toEqual(['1', '₹1,50,000', '₹50,000', '₹1,00,000']);

    const attention = screen.getByRole('region', { name: 'Needs attention' });
    const labels = within(attention)
      .getAllByRole('listitem')
      .filter((li) => li.classList.contains('adm-attn__row'))
      .map((li) => li.querySelector('summary')?.textContent);
    expect(labels).toEqual([
      '1Customer balance overdueShow',
      '1DMC payments due in 7 days / overdueShow',
      '1Travel ended, not marked CompletedShow',
      '1New EnquiriesShow',
      '1Backup overdueShow',
    ]);
    await user.click(within(attention).getByText('Customer balance overdue'));
    const overdueLink = within(attention).getByRole('link', { name: 'UDN-001' });
    expect(overdueLink).toHaveAttribute('href', '/admin/bookings/UDN-001');
    expect(overdueLink.closest('li')).toHaveTextContent(`UDN-001 Asha Patel, ₹1,00,000 overdue since ${formatDate(addDays(today, -3))}`);
    await user.click(within(attention).getByText('Backup overdue'));
    expect(within(attention).getByText(/No backup has been taken on this device yet/)).toBeInTheDocument();
    expect(within(attention).getByRole('link', { name: 'Download a backup in Settings' })).toHaveAttribute('href', '/admin/settings#data');

    // Calendar (default on desktop): bars labelled Booking ID + Client; days start a New booking.
    const calendar = screen.getByRole('region', { name: `Bookings calendar, ${formatMonth(month)}` });
    expect(within(calendar).getByRole('link', { name: 'UDN-001 Asha Patel' })).toHaveAttribute('href', '/admin/bookings/UDN-001');
    expect(within(calendar).getByRole('link', { name: 'UDN-002 Ravi Mehta' })).toHaveClass('adm-bar--pending');
    expect(within(calendar).getByRole('link', { name: `${formatDate(`${month}-01`)}${`${month}-01` === today ? ' (today)' : ''}, new booking` })).toHaveAttribute(
      'href',
      `/admin/bookings/new?start=${month}-01`,
    );

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(params(router).get('month')).toBe(prevMonth);
    expect(await screen.findByRole('region', { name: `Bookings calendar, ${formatMonth(prevMonth)}` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'UDN-003 Ravi Mehta' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'This month' }));
    expect(params(router).get('month')).toBeNull();
  });

  it('table: search, filters and sort live in the URL; footer totals follow the counting rules', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin?view=table&scope=all');

    await waitFor(() => expect(tableIds()).toEqual(['UDN-004', 'UDN-003', 'UDN-001', 'UDN-002'])); // Travel start asc
    const footer = screen.getByRole('rowheader', { name: /4 Bookings/ }).closest('tr')!;
    // Pending excluded: 1,50,000 + 80,000 + 60,000.
    expect(within(footer).getAllByRole('cell').map((c) => c.textContent).filter(Boolean)).toEqual(['₹2,90,000', '₹1,90,000', '₹1,00,000', '₹85,000']);

    await user.type(screen.getByRole('searchbox', { name: 'Search bookings' }), 'ravi');
    await waitFor(() => expect(tableIds()).toEqual(['UDN-003', 'UDN-002']));
    expect(params(router).get('q')).toBe('ravi');
    await user.clear(screen.getByRole('searchbox', { name: 'Search bookings' }));
    await waitFor(() => expect(params(router).get('q')).toBeNull());

    await user.click(screen.getByText('Filters'));
    await user.click(within(screen.getByRole('group', { name: 'Filters' })).getByRole('checkbox', { name: 'Completed' }));
    expect(params(router).get('status')).toBe('Completed');
    expect(tableIds()).toEqual(['UDN-003']);
    expect(screen.getByRole('button', { name: 'Remove filter Status: Completed' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(params(router).get('status')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Selling Price' }));
    expect(params(router).get('sort')).toBe('sellingPrice');
    expect(tableIds()).toEqual(['UDN-002', 'UDN-004', 'UDN-003', 'UDN-001']);
    await user.click(screen.getByRole('button', { name: 'Selling Price' }));
    expect(params(router).get('dir')).toBe('desc');
    expect(tableIds()).toEqual(['UDN-001', 'UDN-003', 'UDN-004', 'UDN-002']);
    expect(screen.getByRole('columnheader', { name: 'Selling Price' })).toHaveAttribute('aria-sort', 'descending');

    // The month scope narrows to Bookings travelling this month.
    await user.click(screen.getByRole('button', { name: formatMonthShort(month) }));
    expect(params(router).get('scope')).toBeNull();
    expect(tableIds()).toEqual(['UDN-001', 'UDN-002']);
  });

  it('a URL with filters renders them; CSV downloads the filtered, sorted rows', async () => {
    const files = captureDownloads();
    const user = userEvent.setup();
    await renderAdmin('/admin?view=table&scope=all&client=c1&sort=bookingNo&dir=desc');

    await waitFor(() => expect(tableIds()).toEqual(['UDN-004', 'UDN-001']));
    expect(screen.getByRole('button', { name: 'Remove filter Customer: Asha Patel' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /UDN-004/ })).toHaveTextContent('Not marked Completed');
    const b1 = screen.getByRole('row', { name: /UDN-001/ });
    expect(within(b1).getByText('₹1,00,000')).toHaveClass('is-overdue');

    await user.click(screen.getByRole('button', { name: 'CSV' }));
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe(`udan-bookings-${today}.csv`);
    const lines = (await text(files[0].blob)).split('\r\n');
    expect(lines[0]).toBe(
      '﻿Booking ID,Category,Customer,Mobile,Destination,Travel start,Travel end,Not marked Completed,Pax,Status,Selling price,Received,Customer outstanding,Commission,Net cost,DMC outstanding,DMCs,Invoice no.,Booked on',
    );
    expect(lines.slice(1, -1).map((l) => l.split(',')[0])).toEqual(['UDN-004', 'UDN-001']);
    expect(lines[2]).toMatch(/^UDN-001,Package,Asha Patel,'\+919811111111,Dubai,/);
  });

  it('Needs attention links open the table pre-filtered, All time', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin');
    const attention = await screen.findByRole('region', { name: 'Needs attention' });
    await user.click(within(attention).getByText('Travel ended, not marked Completed'));
    const row = within(attention).getByText('Travel ended, not marked Completed').closest('li')!;
    await user.click(within(row).getByRole('link', { name: 'Show in table' }));
    expect(params(router).get('view')).toBe('table');
    expect(params(router).get('scope')).toBe('all');
    expect(params(router).get('flag')).toBe('ended');
    await waitFor(() => expect(tableIds()).toEqual(['UDN-004']));
  });

  it('Backup overdue is hidden after a recent backup on this device', async () => {
    localStorage.setItem('udan-admin:last-backup', addDays(today, -2));
    await renderAdmin('/admin');
    const attention = await screen.findByRole('region', { name: 'Needs attention' });
    await waitFor(() => expect(within(attention).getByText('New Enquiries')).toBeInTheDocument());
    expect(within(attention).queryByText('Backup overdue')).not.toBeInTheDocument();
  });
});

describe('Overview data-region states', () => {
  function renderScreen(database: Firestore) {
    return render(
      <MemoryRouter initialEntries={['/admin?view=table']}>
        <AdminDataProvider db={database}>
          <ToastProvider>
            <OverviewScreen />
          </ToastProvider>
        </AdminDataProvider>
      </MemoryRouter>,
    );
  }

  it('loading, then full', async () => {
    renderScreen(googleDb(env));
    expect(screen.getByText('Loading figures')).toBeInTheDocument();
    await waitFor(() => expect(tableIds()).toEqual(['UDN-001', 'UDN-002']));
  });

  it('empty: what goes here + one action; an empty month offers All time', async () => {
    await clearFirestore(env);
    await seedAdmins(env);
    renderScreen(googleDb(env));
    expect(await screen.findByRole('heading', { name: 'No Bookings yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New booking' })).toHaveAttribute('href', '/admin/bookings/new');
  });

  it('error: what broke + Retry', async () => {
    renderScreen(googleDb(env, { email: 'stranger@example.com' }));
    expect(await screen.findByRole('heading', { name: "Couldn't load Bookings" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Couldn't load the month's figures" })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0);
  });
});

describe('Insights (lazy route)', () => {
  it('renders KPIs for the period, switches period in the URL, shows a chart as a table and the top tables', async () => {
    const user = userEvent.setup();
    const router = await renderAdmin('/admin/insights');

    const kpis = await screen.findByLabelText('Key figures', {}, { timeout: 10_000 });
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'This month' }));
    expect(params(router).get('period')).toBe('thisMonth');
    await waitFor(() => expect(within(kpis).getAllByRole('definition')[0]).toHaveTextContent(/^1/));
    expect(within(kpis).getAllByRole('definition')[1]).toHaveTextContent('₹1,50,000');
    expect(screen.getByText(/Pending pipeline: 1 Booking, ₹40,000/)).toBeInTheDocument();

    const monthly = screen.getByRole('figure', { name: 'Selling Price and Commission by month' });
    await user.click(within(monthly).getByRole('button', { name: 'View as table' }));
    const table = within(monthly).getByRole('table', { name: 'Selling Price and Commission by month' });
    expect(within(table).getByRole('row', { name: /₹1,50,000 ₹50,000/ })).toBeInTheDocument();
    expect(within(monthly).getByRole('button', { name: 'View as chart' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getAllByRole('figure')).toHaveLength(8);
    const topClients = screen.getByRole('region', { name: 'Top Customers' });
    expect(within(topClients).getByRole('link', { name: 'Asha Patel' })).toHaveAttribute('href', '/admin/customers/c1');

    await user.click(screen.getByRole('button', { name: 'Custom range' }));
    expect(params(router).get('period')).toBe('custom');
    expect(params(router).get('pfrom')).toBe(`${month}-01`);
  });
});
