/** `settings/documents`: default template per document + WhatsApp / email message texts (Settings → Templates). */
import { doc, onSnapshot, serverTimestamp, setDoc, type DocumentData, type Firestore } from 'firebase/firestore';
import { EMPTY_DOCUMENT_SETTINGS, MESSAGE_KEYS, type DocumentSettings, type DocumentTemplateKind } from '../model';
import { businessProfileFromDoc, BUSINESS_DOC, COLLECTIONS } from './convert';
import { run, toAdminDataError, type AdminDataError } from './errors';
import type { BusinessProfile } from '../model';

export const DOCUMENTS_DOC = 'documents';
const KINDS: DocumentTemplateKind[] = ['invoice', 'admin', 'voucher'];

export function documentSettingsFromDoc(d: DocumentData | undefined): DocumentSettings {
  if (!d) return EMPTY_DOCUMENT_SETTINGS;
  const defaults: DocumentSettings['defaults'] = {};
  const messages: DocumentSettings['messages'] = {};
  for (const k of KINDS) if (typeof d.defaults?.[k] === 'string') defaults[k] = d.defaults[k];
  for (const k of MESSAGE_KEYS) if (typeof d.messages?.[k] === 'string') messages[k] = d.messages[k];
  return { defaults, messages, updatedAt: d.updatedAt?.toDate?.() };
}

/** Replaces the whole doc (blank messages dropped = default text). */
export function saveDocumentSettings(db: Firestore, settings: DocumentSettings): Promise<void> {
  const messages = Object.fromEntries(Object.entries(settings.messages).filter(([, v]) => typeof v === 'string' && v.trim()));
  const defaults = Object.fromEntries(Object.entries(settings.defaults).filter(([, v]) => typeof v === 'string' && v));
  return run(() => setDoc(doc(db, COLLECTIONS.settings, DOCUMENTS_DOC), { defaults, messages, updatedAt: serverTimestamp() }));
}

export type DocState<T> = { status: 'loading' | 'ready' | 'error'; data: T; error?: AdminDataError };

function subscribeSettingsDoc<T>(db: Firestore, id: string, convert: (d: DocumentData | undefined) => T, empty: T, onChange: (s: DocState<T>) => void) {
  let last = empty;
  onChange({ status: 'loading', data: last });
  return onSnapshot(
    doc(db, COLLECTIONS.settings, id),
    (snap) => {
      last = convert(snap.exists() ? snap.data({ serverTimestamps: 'estimate' }) : undefined);
      onChange({ status: 'ready', data: last });
    },
    (error) => onChange({ status: 'error', data: last, error: toAdminDataError(error) }),
  );
}

export function subscribeDocumentSettings(db: Firestore, onChange: (s: DocState<DocumentSettings>) => void): () => void {
  return subscribeSettingsDoc(db, DOCUMENTS_DOC, documentSettingsFromDoc, EMPTY_DOCUMENT_SETTINGS, onChange);
}

/** Live Business profile (no seeding: `getBusinessProfile` seeds on first use). */
export function subscribeBusinessProfile(db: Firestore, onChange: (s: DocState<BusinessProfile>) => void): () => void {
  return subscribeSettingsDoc(db, BUSINESS_DOC, (d) => (d ? businessProfileFromDoc(d) : {}), {}, onChange);
}
