import type { ReactNode } from 'react';
import type { BookingStatus } from '../model';

const statusSlug = (status: BookingStatus) => status.toLowerCase().replace(/\s+/g, '-');

/** Booking Status pill in its status colours (Cancelled is struck through). */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`adm-badge adm-badge--${statusSlug(status)}`}>{status}</span>;
}

/** Tinted inline note: info (teal), warn, danger. */
export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  return <p className={tone === 'info' ? 'adm-note' : `adm-note adm-note--${tone}`}>{children}</p>;
}
