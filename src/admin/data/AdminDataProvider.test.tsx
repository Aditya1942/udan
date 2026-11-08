/** AdminDataProvider: live collections + derived hooks, against the emulator. */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { googleDb, seed, seedAdmins } from '../../test/adminAuth';
import { createRulesEnv } from '../../test/firestoreEmulator';
import { AdminDataProvider, createBooking, useAdminData, useBookingRows, useNewEnquiryCount } from '.';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createRulesEnv('demo-udan-admin-provider');
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedAdmins(env);
  const at = Timestamp.now();
  await seed(env, {
    'clients/c1': { name: 'Asha Patel', mobile: '+919876543210', createdAt: at, updatedAt: at },
    'dmcs/d1': { name: 'Gulf Holidays', createdAt: at, updatedAt: at },
    'inquiries/e1': { name: 'N', phone: '+919811111111', service: 'other', message: '', sourcePage: '/', destination: null, status: 'new', createdAt: at },
    'inquiries/e2': { name: 'M', phone: '+919811111112', service: 'other', message: '', sourcePage: '/', destination: null, status: 'closed', createdAt: at },
  });
});

describe('AdminDataProvider', () => {
  it('loads the four collections and joins Booking rows live', async () => {
    const db = googleDb(env);
    const wrapper = ({ children }: { children: ReactNode }) => <AdminDataProvider db={db}>{children}</AdminDataProvider>;
    const { result } = renderHook(
      () => ({ data: useAdminData(), rows: useBookingRows('2026-11-01'), newCount: useNewEnquiryCount() }),
      { wrapper },
    );
    expect(result.current.rows.status).toBe('loading');
    await waitFor(() => expect(result.current.rows.status).toBe('ready'));
    await waitFor(() => expect(result.current.newCount).toBe(1)); // enquiries load independently
    expect(result.current.data.clientsById.get('c1')?.name).toBe('Asha Patel');

    await createBooking(db, {
      clientId: 'c1',
      category: 'Package',
      tripScope: 'International',
      hasTravel: true,
      destination: 'Dubai',
      travelStart: '2026-12-01',
      travelEnd: '2026-12-03',
      pax: { adults: 1, children: 0, infants: 0 },
      travellerNames: [],
      itinerary: '',
      internalNotes: '',
      sellingPrice: 50_000,
      lines: [{ id: 'l1', type: 'Hotel', dmcId: 'd1', description: 'Hotel', netCost: 40_000 }],
    });
    await waitFor(() => expect(result.current.rows.rows).toHaveLength(1));
    const row = result.current.rows.rows[0];
    expect(row.client?.name).toBe('Asha Patel');
    expect(row.dmcs.map((d) => d.name)).toEqual(['Gulf Holidays']);
    expect(row.money.commission).toBe(10_000);
  });

  it('shows an error state for a non-admin', async () => {
    const db = googleDb(env, { email: 'stranger@example.com' });
    const wrapper = ({ children }: { children: ReactNode }) => <AdminDataProvider db={db}>{children}</AdminDataProvider>;
    const { result } = renderHook(() => useAdminData(), { wrapper });
    await waitFor(() => expect(result.current.bookings.status).toBe('error'));
    expect(result.current.bookings.error?.code).toBe('permission-denied');
  });
});
