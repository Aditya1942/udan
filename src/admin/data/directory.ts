/** Client and DMC CRUD. "Used in N bookings" delete gating is client-side (see model `clientSummary` / `dmcSummary`). */
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import type { ClientFields, DmcFields } from '../model';
import { COLLECTIONS, toCreate, toUpdate } from './convert';
import { run } from './errors';

const CLIENT_OPTIONAL = ['email', 'city', 'notes'] as const;
const DMC_OPTIONAL = ['contactPerson', 'phone', 'email', 'region', 'notes'] as const;

/** Create payload for a Client (also used inside createBooking / saveBookingSection). */
export function clientCreateData(input: ClientFields): Record<string, unknown> {
  return {
    ...toCreate({ ...input, name: input.name.trim(), mobile: input.mobile.trim() }, CLIENT_OPTIONAL),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function createClient(db: Firestore, input: ClientFields): Promise<string> {
  return run(async () => (await addDoc(collection(db, COLLECTIONS.clients), clientCreateData(input))).id);
}

/** Blank or undefined optional fields are removed. */
export function updateClient(db: Firestore, id: string, patch: Partial<ClientFields>): Promise<void> {
  return run(() => updateDoc(doc(db, COLLECTIONS.clients, id), { ...toUpdate(patch, CLIENT_OPTIONAL), updatedAt: serverTimestamp() }));
}

export function deleteClient(db: Firestore, id: string): Promise<void> {
  return run(() => deleteDoc(doc(db, COLLECTIONS.clients, id)));
}

export function createDmc(db: Firestore, input: DmcFields): Promise<string> {
  return run(async () => {
    const data = { ...toCreate({ ...input, name: input.name.trim() }, DMC_OPTIONAL), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    return (await addDoc(collection(db, COLLECTIONS.dmcs), data)).id;
  });
}

export function updateDmc(db: Firestore, id: string, patch: Partial<DmcFields>): Promise<void> {
  return run(() => updateDoc(doc(db, COLLECTIONS.dmcs, id), { ...toUpdate(patch, DMC_OPTIONAL), updatedAt: serverTimestamp() }));
}

export function deleteDmc(db: Firestore, id: string): Promise<void> {
  return run(() => deleteDoc(doc(db, COLLECTIONS.dmcs, id)));
}
