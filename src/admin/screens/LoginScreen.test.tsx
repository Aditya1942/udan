/**
 * Seam 5: Login against the Auth + Firestore emulators with the real rules.
 * The Google popup is replaced by a credential sign-in (the Auth emulator accepts unsigned Google ID tokens),
 * so the token carries sign_in_provider google.com + email_verified like a real popup sign-in.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, seed, seedAdmins } from '../../test/adminAuth';
import { createRulesEnv } from '../../test/firestoreEmulator';
import { AdminApp } from '../AdminApp';
import { DENIED_MESSAGE } from '../auth';

const PROJECT_ID = 'demo-udan-admin-login';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

let env: RulesTestEnvironment;
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let appCount = 0;

/** Stand-in for the Google popup: signs in as `email` with a Google credential. */
const signInAs = (email: string) => (a: Auth) =>
  signInWithCredential(a, GoogleAuthProvider.credential(JSON.stringify({ sub: `sub-${email}`, email, email_verified: true })));

async function authAccounts(): Promise<number> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = (await res.json()) as { recordsCount?: string };
  return Number(body.recordsCount ?? 0);
}

function renderAdmin(path: string, signIn: (a: Auth) => Promise<unknown>) {
  const router = createMemoryRouter([{ path: '/admin/*', element: <AdminApp auth={auth} db={db} signIn={signIn} /> }], {
    initialEntries: [path],
  });
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
  await env.clearFirestore();
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await seedAdmins(env);
  await seed(env, {
    'inquiries/e1': { name: 'N', phone: '+919811111111', service: 'other', message: '', sourcePage: '/', destination: null, status: 'new', createdAt: new Date() },
  });
  app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `login-${++appCount}`);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const { host, port } = env.emulators.firestore!;
  connectFirestoreEmulator(db, host, port);
});
afterEach(async () => {
  await deleteApp(app);
});

describe('Login', () => {
  it('denies a Google account that is not on the allow-list, deletes it and signs out', async () => {
    const user = userEvent.setup();
    const router = renderAdmin('/admin/customers', signInAs('stranger@example.com'));

    // Signed out → login with the deep link kept in ?next=.
    expect(await screen.findByRole('heading', { name: 'Sign in to UDAN admin' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Fcustomers');
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(DENIED_MESSAGE);
    expect(auth.currentUser).toBeNull();
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
    await waitFor(async () => expect(await authAccounts()).toBe(0));
  });

  it('lets an allow-listed account through to the deep link, with the shell and the New enquiry badge', async () => {
    const user = userEvent.setup();
    const router = renderAdmin('/admin/customers', signInAs(ADMIN_EMAIL.toUpperCase()));

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/customers');
    expect(document.title).toBe('Customers · UDAN admin');
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(nav).getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(within(nav).getByRole('link', { name: /Enquiries/ })).toHaveAccessibleName('Enquiries 1 new'));

    // Settings → Account → Sign out returns to login.
    await user.click(within(nav).getByRole('link', { name: 'Settings' }));
    const account = await screen.findByRole('region', { name: 'Account' });
    expect(account).toHaveTextContent(new RegExp(ADMIN_EMAIL, "i"));
    await user.click(within(account).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to UDAN admin' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
