/**
 * `shares/{token}`: live document links (`/d/<token>`). The doc holds the customer-safe view-model (see
 * `pdf/share.ts`), never the Booking. Anyone with the token may read it (rules: get only, no list); Admins list and write.
 * Disabling is final — "New link" creates a new token.
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import type { ISODate } from '../model';
import type { ShareKind, SharePayload, ShareUnavailable } from '../pdf/share';
import { SHARE_VERSION } from '../pdf/share';
import { run, toAdminDataError, type AdminDataError } from './errors';

export const SHARES = 'shares';

export type ShareRecord = SharePayload & {
  token: string;
  kind: ShareKind;
  bookingId: string;
  /** Template family id. */
  family: string;
  active: boolean;
  issuedOn: ISODate;
  v: number;
  updatedAt?: Date;
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function shareFromDoc(token: string, d: DocumentData): ShareRecord {
  return {
    token,
    kind: d.kind === 'voucher' ? 'voucher' : 'invoice',
    bookingId: str(d.bookingId),
    family: str(d.family),
    active: d.active === true,
    issuedOn: str(d.issuedOn),
    v: typeof d.v === 'number' ? d.v : 0,
    title: str(d.title),
    filename: str(d.filename),
    tradingName: str(d.tradingName),
    phone: str(d.phone),
    view: str(d.view),
    unavailable: (d.unavailable as ShareUnavailable | undefined) || undefined,
    updatedAt: d.updatedAt?.toDate?.(),
  };
}

/** 128 random bits, base64url (22 chars). */
export function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function payloadFields(p: SharePayload): Record<string, unknown> {
  return {
    title: p.title,
    filename: p.filename,
    tradingName: p.tradingName,
    phone: p.phone,
    view: p.view,
    unavailable: p.unavailable ?? '',
  };
}

export type ShareListState = { status: 'loading' | 'ready' | 'error'; data: ShareRecord[]; error?: AdminDataError };

/** Live list of active links (the sync keeps these current). */
export function subscribeActiveShares(db: Firestore, onChange: (s: ShareListState) => void): () => void {
  let last: ShareRecord[] = [];
  onChange({ status: 'loading', data: last });
  return onSnapshot(
    query(collection(db, SHARES), where('active', '==', true)),
    (snap) => {
      last = snap.docs.map((d) => shareFromDoc(d.id, d.data({ serverTimestamps: 'estimate' })));
      onChange({ status: 'ready', data: last });
    },
    (error) => onChange({ status: 'error', data: last, error: toAdminDataError(error) }),
  );
}

export type PublishShareInput = {
  /** The Booking's active link for this document, if any (updated in place: same URL). */
  existing?: ShareRecord;
  kind: ShareKind;
  bookingId: string;
  family: string;
  issuedOn: ISODate;
  payload: SharePayload;
};

/** Creates the link or updates the existing one (template, issue date, data). Resolves with the token. */
export function publishShare(db: Firestore, { existing, kind, bookingId, family, issuedOn, payload }: PublishShareInput): Promise<string> {
  return run(async () => {
    if (existing?.active) {
      await updateDoc(doc(db, SHARES, existing.token), { family, issuedOn, v: SHARE_VERSION, ...payloadFields(payload), updatedAt: serverTimestamp() });
      return existing.token;
    }
    const token = newShareToken();
    await setDoc(doc(db, SHARES, token), {
      kind,
      bookingId,
      family,
      active: true,
      issuedOn,
      v: SHARE_VERSION,
      ...payloadFields(payload),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return token;
  });
}

/** Rewrites the derived fields of an active link (ShareSync). */
export function syncShare(db: Firestore, token: string, payload: SharePayload): Promise<void> {
  return run(() => updateDoc(doc(db, SHARES, token), { v: SHARE_VERSION, ...payloadFields(payload), updatedAt: serverTimestamp() }));
}

/** Turns a link off for good: the document data is removed, the page says "no longer active". */
export function disableShare(db: Firestore, token: string): Promise<void> {
  return run(() => updateDoc(doc(db, SHARES, token), { active: false, view: '', unavailable: '', updatedAt: serverTimestamp() }));
}

/** Public read by token (`/d/<token>`); null when missing. */
export async function readShare(db: Firestore, token: string): Promise<ShareRecord | null> {
  const snap = await getDoc(doc(db, SHARES, token));
  return snap.exists() ? shareFromDoc(snap.id, snap.data()) : null;
}

export function shareUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/d/${token}`;
}
