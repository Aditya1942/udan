/**
 * DocumentsProvider: live Document settings (`settings/documents`), Business profile and active document links
 * (`shares`) for the admin session — plus ShareSync: whenever a Booking, its Client or the Business profile changes,
 * every active link of that Booking is rewritten from current data, so `/d/<token>` always shows what the admin sees.
 * Runs client-side (no Cloud Functions): all Booking writes come from this app.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Firestore } from 'firebase/firestore';
import { EMPTY_DOCUMENT_SETTINGS, type BusinessProfile, type DocumentSettings } from '../model';
import { samePayload, sharePayload, type ShareKind } from '../pdf/share';
import { useAdminData } from './AdminDataProvider';
import { subscribeBusinessProfile, subscribeDocumentSettings, type DocState } from './documentSettings';
import { subscribeActiveShares, syncShare, type ShareListState, type ShareRecord } from './shares';

export type DocumentsContextValue = {
  settings: DocState<DocumentSettings>;
  profile: DocState<BusinessProfile>;
  shares: ShareListState;
  /** The active link of one Booking's document. */
  shareFor: (bookingId: string, kind: ShareKind) => ShareRecord | undefined;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ db, children }: { db: Firestore; children: ReactNode }) {
  const [settings, setSettings] = useState<DocState<DocumentSettings>>({ status: 'loading', data: EMPTY_DOCUMENT_SETTINGS });
  const [profile, setProfile] = useState<DocState<BusinessProfile>>({ status: 'loading', data: {} });
  const [shares, setShares] = useState<ShareListState>({ status: 'loading', data: [] });

  useEffect(() => subscribeDocumentSettings(db, setSettings), [db]);
  useEffect(() => subscribeBusinessProfile(db, setProfile), [db]);
  useEffect(() => subscribeActiveShares(db, setShares), [db]);

  useShareSync(db, profile, shares);

  const value = useMemo<DocumentsContextValue>(() => {
    const byKey = new Map(shares.data.filter((s) => s.active).map((s) => [`${s.bookingId}|${s.kind}`, s]));
    return { settings, profile, shares, shareFor: (bookingId, kind) => byKey.get(`${bookingId}|${kind}`) };
  }, [settings, profile, shares]);

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

/** Rewrites stale active links. Writes are idempotent; `pending` stops repeats until the snapshot catches up. */
function useShareSync(db: Firestore, profile: DocState<BusinessProfile>, shares: ShareListState) {
  const { bookings, clients, clientsById } = useAdminData();
  const pending = useRef(new Map<string, string>());

  useEffect(() => {
    if (profile.status !== 'ready' || shares.status !== 'ready' || bookings.status !== 'ready' || clients.status !== 'ready') return;
    const byId = new Map(bookings.data.map((b) => [b.id, b]));
    for (const share of shares.data) {
      const booking = byId.get(share.bookingId);
      if (!share.active || !booking) continue;
      let next;
      try {
        next = sharePayload({ kind: share.kind, booking, client: clientsById.get(booking.clientId), profile: profile.data, issuedOn: share.issuedOn });
      } catch {
        continue; // a view builder refused this Booking; leave the link as it is
      }
      if (samePayload(share, next)) {
        pending.current.delete(share.token);
        continue;
      }
      const key = JSON.stringify(next);
      if (pending.current.get(share.token) === key) continue;
      pending.current.set(share.token, key);
      syncShare(db, share.token, next).catch(() => pending.current.delete(share.token));
    }
  }, [db, profile, shares, bookings, clients, clientsById]);
}

export function useDocuments(): DocumentsContextValue {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used inside <DocumentsProvider>');
  return ctx;
}
