/** Live `onSnapshot` listeners on the four admin collections (no React; the provider wraps these). */
import { collection, onSnapshot, type DocumentData, type Firestore } from 'firebase/firestore';
import type { Booking, Client, Dmc, Enquiry } from '../model';
import { bookingFromDoc, clientFromDoc, COLLECTIONS, dmcFromDoc, enquiryFromDoc } from './convert';
import { toAdminDataError, type AdminDataError } from './errors';

export type CollectionStatus = 'loading' | 'ready' | 'error';

export type CollectionState<T> = {
  status: CollectionStatus;
  /** Last good data (kept while an error is shown). */
  data: T[];
  error?: AdminDataError;
};

export type AdminCollections = {
  clients: Client[];
  dmcs: Dmc[];
  bookings: Booking[];
  enquiries: Enquiry[];
};
export type AdminCollectionName = keyof AdminCollections;
export const ADMIN_COLLECTION_NAMES: readonly AdminCollectionName[] = ['clients', 'dmcs', 'bookings', 'enquiries'];

const collator = new Intl.Collator('en-IN', { sensitivity: 'base', numeric: true });

type Spec<T> = { path: string; convert: (id: string, d: DocumentData) => T; sort: (a: T, b: T) => number };

const SPECS: { [K in AdminCollectionName]: Spec<AdminCollections[K][number]> } = {
  clients: { path: COLLECTIONS.clients, convert: clientFromDoc, sort: (a, b) => collator.compare(a.name, b.name) },
  dmcs: { path: COLLECTIONS.dmcs, convert: dmcFromDoc, sort: (a, b) => collator.compare(a.name, b.name) },
  bookings: { path: COLLECTIONS.bookings, convert: bookingFromDoc, sort: (a, b) => a.bookingSeq - b.bookingSeq },
  enquiries: {
    path: COLLECTIONS.inquiries,
    convert: enquiryFromDoc,
    sort: (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  },
};

/**
 * Subscribes to one admin collection. Clients/DMCs sort by name, Bookings by Booking ID,
 * Enquiries newest first. Pending server timestamps read as local estimates.
 */
export function subscribeCollection<K extends AdminCollectionName>(
  db: Firestore,
  name: K,
  onChange: (state: CollectionState<AdminCollections[K][number]>) => void,
): () => void {
  const spec = SPECS[name] as Spec<AdminCollections[K][number]>;
  let last: AdminCollections[K][number][] = [];
  onChange({ status: 'loading', data: last });
  return onSnapshot(
    collection(db, spec.path),
    (snap) => {
      last = snap.docs.map((d) => spec.convert(d.id, d.data({ serverTimestamps: 'estimate' }))).sort(spec.sort);
      onChange({ status: 'ready', data: last });
    },
    (error) => onChange({ status: 'error', data: last, error: toAdminDataError(error) }),
  );
}
