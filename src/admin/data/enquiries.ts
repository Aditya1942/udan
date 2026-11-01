/** Enquiry admin updates. `converted` is set only by `createBooking` (conversion) and is final. */
import { deleteDoc, deleteField, doc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import type { ManualEnquiryStatus } from '../model';
import { COLLECTIONS } from './convert';
import { run } from './errors';

/**
 * Mark contacted / Close (optional reason) / Reopen. Any status other than `closed` clears `closeReason`.
 * Rejected by the rules on a converted Enquiry.
 */
export function setEnquiryStatus(
  db: Firestore,
  id: string,
  status: ManualEnquiryStatus,
  { closeReason }: { closeReason?: string } = {},
): Promise<void> {
  const reason = closeReason?.trim();
  return run(() =>
    updateDoc(doc(db, COLLECTIONS.inquiries, id), {
      status,
      closeReason: status === 'closed' && reason ? reason : deleteField(),
      updatedAt: serverTimestamp(),
    }),
  );
}

/** Admin notes (saved on blur). Blank removes them. */
export function saveEnquiryNotes(db: Firestore, id: string, notes: string): Promise<void> {
  const value = notes.trim();
  return run(() => updateDoc(doc(db, COLLECTIONS.inquiries, id), { adminNotes: value || deleteField(), updatedAt: serverTimestamp() }));
}

/** Delete as spam. Rules refuse converted Enquiries. */
export function deleteEnquiry(db: Firestore, id: string): Promise<void> {
  return run(() => deleteDoc(doc(db, COLLECTIONS.inquiries, id)));
}
