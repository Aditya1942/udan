/** `settings/business`: read with seeding from `src/content/business.ts`, and one-form save. */
import { doc, runTransaction, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { defaultBusinessProfile, normaliseBusinessProfile, type BusinessProfile } from '../model';
import { BUSINESS_DOC, businessProfileFromDoc, COLLECTIONS } from './convert';
import { run } from './errors';

/**
 * Reads the Business profile. If the doc is missing and `seed` (default), writes the default profile
 * (trading name, address, phone) in a transaction and returns it.
 */
export function getBusinessProfile(db: Firestore, { seed = true }: { seed?: boolean } = {}): Promise<BusinessProfile> {
  const ref = doc(db, COLLECTIONS.settings, BUSINESS_DOC);
  return run(() =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return businessProfileFromDoc(snap.data());
      if (!seed) return {};
      const profile = defaultBusinessProfile();
      tx.set(ref, { ...profile, updatedAt: serverTimestamp() });
      return profile;
    }),
  );
}

/** Replaces the whole profile (trimmed; empty fields removed). */
export function saveBusinessProfile(db: Firestore, profile: BusinessProfile): Promise<void> {
  const { updatedAt: _ignored, ...fields } = profile;
  return run(() => setDoc(doc(db, COLLECTIONS.settings, BUSINESS_DOC), { ...normaliseBusinessProfile(fields), updatedAt: serverTimestamp() }));
}
