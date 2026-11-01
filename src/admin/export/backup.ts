/**
 * Backup serialiser: `{ format: "udan-admin-backup", version: 1, exportedAt, projectId, collections: { <name>: { <docId>: data } } }`.
 * Firestore Timestamps (createdAt, updatedAt, convertedAt, …) become ISO 8601 strings; everything else is kept as-is
 * (incl. the signature data URL). Lossless for a local firebase-admin restore script; there is no in-app restore.
 */
import { Timestamp } from 'firebase/firestore';
import type { ISODate } from '../model';

export const BACKUP_FORMAT = 'udan-admin-backup';
export const BACKUP_VERSION = 1;
/** Every admin collection (`config` is console-edited and excluded). */
export const BACKUP_COLLECTIONS = ['clients', 'dmcs', 'bookings', 'counters', 'settings', 'inquiries'] as const;
export type BackupCollection = (typeof BACKUP_COLLECTIONS)[number];

export type BackupDocs = Record<string, Record<string, unknown>>;
export type BackupInput = {
  projectId: string;
  exportedAt: Date;
  collections: Partial<Record<BackupCollection, BackupDocs>>;
};

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  projectId: string;
  collections: Record<BackupCollection, BackupDocs>;
};

/** Timestamps / Dates → ISO strings, recursively through plain objects and arrays. */
export function toJsonValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJsonValue(v);
    return out;
  }
  return value;
}

export function serialiseBackup({ projectId, exportedAt, collections }: BackupInput): Backup {
  const out = {} as Record<BackupCollection, BackupDocs>;
  for (const name of BACKUP_COLLECTIONS) {
    const docs: BackupDocs = {};
    for (const [id, data] of Object.entries(collections[name] ?? {})) docs[id] = toJsonValue(data) as Record<string, unknown>;
    out[name] = docs;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), projectId, collections: out };
}

/** Pretty-printed JSON text. */
export const backupJson = (input: BackupInput) => `${JSON.stringify(serialiseBackup(input), null, 2)}\n`;

export const backupFilename = (today: ISODate) => `udan-backup-${today}.json`;
