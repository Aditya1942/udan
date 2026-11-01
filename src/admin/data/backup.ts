/**
 * Full reads for the Backup: `clients`, `dmcs`, `bookings`, `counters`, `inquiries` (getDocs) and `settings/business`
 * (getDoc: the rules allow only that id, so the collection can't be listed). Raw doc data, Timestamps untouched;
 * the export module's serialiser converts them.
 */
import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore';
import { BUSINESS_DOC, COLLECTIONS } from './convert';
import { run } from './errors';

type RawDocs = Record<string, Record<string, unknown>>;
export type RawCollections = Record<'clients' | 'dmcs' | 'bookings' | 'counters' | 'settings' | 'inquiries', RawDocs>;

export function readBackupCollections(db: Firestore): Promise<RawCollections> {
  return run(async () => {
    const list = async (name: string) => {
      const snap = await getDocs(collection(db, name));
      return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    };
    const [clients, dmcs, bookings, counters, inquiries, business] = await Promise.all([
      list(COLLECTIONS.clients),
      list(COLLECTIONS.dmcs),
      list(COLLECTIONS.bookings),
      list(COLLECTIONS.counters),
      list(COLLECTIONS.inquiries),
      getDoc(doc(db, COLLECTIONS.settings, BUSINESS_DOC)),
    ]);
    const settings: RawDocs = business.exists() ? { [BUSINESS_DOC]: business.data() } : {};
    return { clients, dmcs, bookings, counters, settings, inquiries };
  });
}

/** The Firestore project id (for the Backup header). */
export const projectIdOf = (db: Firestore) => db.app.options.projectId ?? '';
