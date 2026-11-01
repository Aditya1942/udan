/**
 * Seam 2: Firestore security rules for `inquiries`, against the emulator.
 * The admin build extends this harness (see docs/specs/udan-admin.md, Testing Decisions).
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
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
import { SERVICE_IDS } from '../../content/business';
import { contextDb, createRulesEnv } from '../firestoreEmulator';

let env: RulesTestEnvironment;
let anon: Firestore;

beforeAll(async () => {
  env = await createRulesEnv('demo-udan-rules');
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  anon = contextDb(env.unauthenticatedContext());
});

/** A valid public create payload; override fields to make it invalid. */
function inquiry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Asha Patel',
    phone: '+919876543210',
    service: 'visa-services',
    message: 'Planning a trip in December.',
    sourcePage: '/contact',
    destination: 'Dubai',
    status: 'new',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

function without(key: string): Record<string, unknown> {
  const { [key]: _omit, ...rest } = inquiry();
  return rest;
}

const create = (data: Record<string, unknown>) => addDoc(collection(anon, 'inquiries'), data);

async function seedInquiry(id = 'seeded'): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(contextDb(context), 'inquiries', id), inquiry({ createdAt: Timestamp.now() }));
  });
}

describe('inquiries: public create', () => {
  it('allows a valid enquiry', async () => {
    await assertSucceeds(create(inquiry()));
  });

  it('allows a null destination and an empty message', async () => {
    await assertSucceeds(create(inquiry({ destination: null, message: '' })));
  });

  it('allows boundary lengths', async () => {
    await assertSucceeds(
      create(
        inquiry({
          name: 'Al',
          message: 'm'.repeat(2000),
          sourcePage: '/'.padEnd(100, 'x'),
          destination: 'd'.repeat(100),
        }),
      ),
    );
  });

  it.each(SERVICE_IDS)('allows catalogue service %s', async (service) => {
    await assertSucceeds(create(inquiry({ service })));
  });

  it('rejects extra keys', async () => {
    await assertFails(create(inquiry({ email: 'a@example.com' })));
    await assertFails(create(inquiry({ website: 'spam' })));
  });

  it.each(['name', 'phone', 'service', 'message', 'sourcePage', 'destination', 'status', 'createdAt'])(
    'rejects a missing %s',
    async (key) => {
      await assertFails(create(without(key)));
    },
  );

  it.each([
    ['name', 42],
    ['phone', 919876543210],
    ['service', ['visa-services']],
    ['message', null],
    ['sourcePage', 1],
    ['destination', 7],
    ['createdAt', '2026-11-01'],
  ])('rejects a wrong type for %s', async (key, value) => {
    await assertFails(create(inquiry({ [key]: value })));
  });

  it.each([
    ['name', 'A'],
    ['name', 'n'.repeat(101)],
    ['message', 'm'.repeat(2001)],
    ['sourcePage', ''],
    ['sourcePage', '/'.padEnd(101, 'x')],
    ['destination', ''],
    ['destination', 'd'.repeat(101)],
  ])('rejects an out-of-range %s', async (key, value) => {
    await assertFails(create(inquiry({ [key]: value })));
  });

  it.each(['9876543210', '+91 98765 43210', '+9198765432', '+915876543210', '+14155550123'])(
    'rejects phone %s (not E.164 Indian mobile)',
    async (phone) => {
      await assertFails(create(inquiry({ phone })));
    },
  );

  it('rejects an unknown service', async () => {
    await assertFails(create(inquiry({ service: 'free-holidays' })));
  });

  it.each(['contacted', 'converted', 'closed', ''])('rejects status %j', async (status) => {
    await assertFails(create(inquiry({ status })));
  });

  it('rejects a client-supplied createdAt', async () => {
    await assertFails(create(inquiry({ createdAt: Timestamp.now() })));
    await assertFails(create(inquiry({ createdAt: Timestamp.fromMillis(Date.now() + 60_000) })));
  });

  it('applies the same rules to setDoc with a chosen id', async () => {
    await assertSucceeds(setDoc(doc(anon, 'inquiries', 'chosen-id'), inquiry()));
    await assertFails(setDoc(doc(anon, 'inquiries', 'chosen-id-2'), inquiry({ status: 'closed' })));
  });
});

describe('inquiries: no public read, update or delete', () => {
  beforeEach(() => seedInquiry());

  it('denies get and list', async () => {
    await assertFails(getDoc(doc(anon, 'inquiries', 'seeded')));
    await assertFails(getDocs(collection(anon, 'inquiries')));
  });

  it('denies update', async () => {
    await assertFails(updateDoc(doc(anon, 'inquiries', 'seeded'), { status: 'contacted' }));
    await assertFails(setDoc(doc(anon, 'inquiries', 'seeded'), inquiry()));
  });

  it('denies delete', async () => {
    await assertFails(deleteDoc(doc(anon, 'inquiries', 'seeded')));
  });

  it('denies a signed-in (non-admin) user too', async () => {
    const signedIn = contextDb(env.authenticatedContext('someone'));
    await assertFails(getDoc(doc(signedIn, 'inquiries', 'seeded')));
    await assertFails(getDocs(collection(signedIn, 'inquiries')));
    await assertFails(deleteDoc(doc(signedIn, 'inquiries', 'seeded')));
  });
});

describe('every other path', () => {
  it.each(['clients/c1', 'bookings/b1', 'config/admins', 'settings/business', 'inquiries/x/notes/n1'])(
    'denies read and write on %s',
    async (path) => {
      const ref = doc(anon, path);
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, { any: 'thing' }));
      await assertFails(deleteDoc(ref));
    },
  );
});
