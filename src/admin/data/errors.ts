/**
 * Error mapping for every admin Firestore call: `permission-denied | network | conflict | unknown`.
 * A process-wide permission-denied handler lets the auth layer sign out and return to login
 * (removed emails lose access on their next request).
 */

export type AdminDataErrorCode = 'permission-denied' | 'network' | 'conflict' | 'unknown';

export class AdminDataError extends Error {
  readonly code: AdminDataErrorCode;
  readonly cause?: unknown;

  constructor(code: AdminDataErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'AdminDataError';
    this.code = code;
    this.cause = cause;
  }
}

const CODE_MAP: Record<string, AdminDataErrorCode> = {
  'permission-denied': 'permission-denied',
  unauthenticated: 'permission-denied',
  unavailable: 'network',
  'deadline-exceeded': 'network',
  aborted: 'conflict',
  'already-exists': 'conflict',
  'failed-precondition': 'conflict',
  'not-found': 'conflict',
};

let permissionDeniedHandler: ((error: AdminDataError) => void) | null = null;

/** Registers the global permission-denied handler (one at a time); returns an unregister function. */
export function setPermissionDeniedHandler(handler: ((error: AdminDataError) => void) | null): () => void {
  permissionDeniedHandler = handler;
  return () => {
    if (permissionDeniedHandler === handler) permissionDeniedHandler = null;
  };
}

/** Maps any thrown value to an AdminDataError (and notifies the permission-denied handler). */
export function toAdminDataError(error: unknown): AdminDataError {
  const mapped =
    error instanceof AdminDataError
      ? error
      : (() => {
          const code = (error as { code?: unknown } | null)?.code;
          const message = error instanceof Error ? error.message : String(error);
          return new AdminDataError(typeof code === 'string' ? (CODE_MAP[code] ?? 'unknown') : 'unknown', message, error);
        })();
  if (mapped.code === 'permission-denied') permissionDeniedHandler?.(mapped);
  return mapped;
}

/** Runs a Firestore operation, rethrowing failures as AdminDataError. */
export async function run<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (error) {
    throw toAdminDataError(error);
  }
}
