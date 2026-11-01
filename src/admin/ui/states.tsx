/** The four states every data region shows: loading skeleton, empty, error (with Retry), full. */
import type { ReactNode } from 'react';
import type { AdminDataError } from '../data';

export function Spinner({ large = false, label }: { large?: boolean; label?: string }) {
  return <span className={large ? 'adm-spinner adm-spinner--lg' : 'adm-spinner'} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** Centred full-screen spinner (auth checks, lazy screens): no shell flash. */
export function FullScreenSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="adm-fullscreen" role="status" aria-live="polite">
      <span className="adm-spinner adm-spinner--lg" aria-hidden />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

/** Skeleton lines in a bordered box. */
export function LoadingState({ lines = 4, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div className="adm-skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="adm-skeleton__line" aria-hidden />
      ))}
    </div>
  );
}

export type EmptyStateProps = {
  /** What goes here, e.g. "No Clients yet". */
  title: string;
  /** One line of explanation. */
  children?: ReactNode;
  /** The one action (usually a Button or ButtonLink). */
  action?: ReactNode;
};

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="adm-empty">
      <h3 className="adm-h3">{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

/** Plain-language explanation of a data-layer error. */
export function errorMessage(error: AdminDataError | Error | null | undefined): string {
  const code = (error as AdminDataError | undefined)?.code;
  switch (code) {
    case 'network':
      return "Couldn't reach the database. Check your connection and try again.";
    case 'permission-denied':
      return "Your account doesn't have access to this data.";
    case 'conflict':
      return 'The data changed while this was saving. Try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}

export type ErrorStateProps = {
  /** What broke, e.g. "Couldn't load Bookings". */
  title: string;
  error?: AdminDataError | Error | null;
  onRetry?: () => void;
};

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div className="adm-error" role="alert">
      <h3 className="adm-h3">{title}</h3>
      <p>{errorMessage(error)}</p>
      {onRetry ? (
        <button type="button" className="adm-btn adm-btn--outline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export type DataRegionProps = {
  status: 'loading' | 'ready' | 'error';
  error?: AdminDataError | Error | null;
  onRetry?: () => void;
  /** Error title, e.g. "Couldn't load Clients". */
  errorTitle: string;
  /** True when the region is ready but has nothing to show. */
  isEmpty?: boolean;
  /** Rendered when ready and `isEmpty` (usually an EmptyState). */
  empty?: ReactNode;
  /** Custom skeleton; defaults to LoadingState. */
  loading?: ReactNode;
  children: ReactNode;
};

/**
 * Picks the state for a data region. Errors win only when there's no data to keep showing;
 * pass `status: 'ready'` with stale data if you prefer to keep it visible.
 */
export function DataRegion({ status, error, onRetry, errorTitle, isEmpty, empty, loading, children }: DataRegionProps) {
  if (status === 'loading') return <>{loading ?? <LoadingState />}</>;
  if (status === 'error') return <ErrorState title={errorTitle} error={error} onRetry={onRetry} />;
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}
