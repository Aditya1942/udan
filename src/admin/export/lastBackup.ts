/**
 * "Last backup on this device": an IST date in localStorage (per device; no Firestore doc). Feeds the Data card
 * and the dashboard's Backup overdue item (`needsAttention({ lastBackup })`, overdue when never or > 30 days).
 */
import { useEffect, useState } from 'react';
import { isISODate, type ISODate } from '../model';

export const LAST_BACKUP_KEY = 'udan-admin:last-backup';
const EVENT = 'udan-admin:last-backup';

export function readLastBackup(): ISODate | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY);
    return isISODate(v) ? v : null;
  } catch {
    return null;
  }
}

export function recordBackup(date: ISODate): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date);
  } catch {
    // Storage unavailable (private mode): the reminder just stays on.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Live value (same tab via a custom event, other tabs via `storage`). */
export function useLastBackup(): ISODate | null {
  const [value, setValue] = useState(readLastBackup);
  useEffect(() => {
    const sync = () => setValue(readLastBackup());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return value;
}
