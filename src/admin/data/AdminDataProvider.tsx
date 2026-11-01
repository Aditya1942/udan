/**
 * AdminDataProvider: one onSnapshot listener per admin collection (clients, dmcs, bookings, inquiries)
 * for the whole admin session, so screens share live data and concurrent Admins stay in sync.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Firestore } from 'firebase/firestore';
import { buildBookingRows, todayIST, type BookingRow, type Client, type Dmc, type ISODate } from '../model';
import {
  ADMIN_COLLECTION_NAMES,
  subscribeCollection,
  type AdminCollectionName,
  type AdminCollections,
  type CollectionState,
} from './subscribe';

type States = { [K in AdminCollectionName]: CollectionState<AdminCollections[K][number]> };

export type AdminDataContextValue = States & {
  db: Firestore;
  /** Re-subscribe one collection (error state → Retry). */
  retry: (name: AdminCollectionName) => void;
  clientsById: ReadonlyMap<string, Client>;
  dmcsById: ReadonlyMap<string, Dmc>;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

function loadingStates(): States {
  return {
    clients: { status: 'loading', data: [] },
    dmcs: { status: 'loading', data: [] },
    bookings: { status: 'loading', data: [] },
    enquiries: { status: 'loading', data: [] },
  };
}

export function AdminDataProvider({ db, children }: { db: Firestore; children: ReactNode }) {
  const [states, setStates] = useState<States>(loadingStates);
  const unsubscribers = useRef(new Map<AdminCollectionName, () => void>());

  const subscribe = useCallback(
    (name: AdminCollectionName) => {
      unsubscribers.current.get(name)?.();
      unsubscribers.current.set(
        name,
        subscribeCollection(db, name, (state) => setStates((s) => ({ ...s, [name]: state }))),
      );
    },
    [db],
  );

  useEffect(() => {
    const subs = unsubscribers.current;
    for (const name of ADMIN_COLLECTION_NAMES) subscribe(name);
    return () => {
      for (const unsubscribe of subs.values()) unsubscribe();
      subs.clear();
    };
  }, [subscribe]);

  const retry = subscribe;
  const clientsById = useMemo(() => new Map(states.clients.data.map((c) => [c.id, c])), [states.clients.data]);
  const dmcsById = useMemo(() => new Map(states.dmcs.data.map((d) => [d.id, d])), [states.dmcs.data]);
  const value = useMemo(() => ({ ...states, db, retry, clientsById, dmcsById }), [states, db, retry, clientsById, dmcsById]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

/** The whole admin data context. Throws outside AdminDataProvider. */
export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used inside <AdminDataProvider>');
  return ctx;
}

/** The Firestore instance for write calls (`createBooking(db, …)`). */
export function useAdminDb(): Firestore {
  return useAdminData().db;
}

export const useClients = () => useAdminData().clients;
export const useDmcs = () => useAdminData().dmcs;
export const useBookings = () => useAdminData().bookings;
export const useEnquiries = () => useAdminData().enquiries;

/** Live count of `status == 'new'` Enquiries (nav badge). */
export function useNewEnquiryCount(): number {
  const { data } = useEnquiries();
  return useMemo(() => data.filter((e) => e.status === 'new').length, [data]);
}

export type RowsState = { status: 'loading' | 'ready' | 'error'; rows: BookingRow[]; errors: CollectionState<unknown>['error'][] };

/** Bookings joined with Clients and DMCs, plus money and flags. Ready when all three collections are. */
export function useBookingRows(today: ISODate = todayIST()): RowsState {
  const { bookings, clients, dmcs } = useAdminData();
  const rows = useMemo(() => buildBookingRows(bookings.data, clients.data, dmcs.data, today), [bookings.data, clients.data, dmcs.data, today]);
  const all = [bookings, clients, dmcs];
  const status = all.some((s) => s.status === 'error') ? 'error' : all.every((s) => s.status === 'ready') ? 'ready' : 'loading';
  return { status, rows, errors: all.map((s) => s.error).filter(Boolean) };
}

/** A Booking (by Booking ID, the route key) from the live list. */
export function useBookingByNo(bookingNo: string) {
  const bookings = useBookings();
  const booking = useMemo(() => bookings.data.find((b) => b.bookingNo === bookingNo), [bookings.data, bookingNo]);
  return { status: bookings.status, booking, error: bookings.error };
}
