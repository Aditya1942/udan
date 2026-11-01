/**
 * Enquiry module: the single entry point for storing an Enquiry from the website form.
 * Validates + normalises the input, writes it to `inquiries`, and maps failures to a reason.
 * Takes the Firestore instance as an argument so tests can point it at the emulator.
 */
import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';
import { validateEnquiry, type EnquiryInput, type FieldErrors } from './validation';

export const INQUIRIES = 'inquiries';

export type SubmitFailureReason = 'validation' | 'network' | 'rejected';

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: SubmitFailureReason; fieldErrors?: FieldErrors };

export type SubmitOptions = {
  /**
   * Give up waiting for the server after this long. Firestore queues writes while offline
   * and would otherwise never settle, leaving the form stuck on "Sending…".
   */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;

/** Codes meaning the server (rules) refused the write; anything else is treated as a network problem. */
const REJECTED_CODES = new Set(['permission-denied', 'invalid-argument']);

class TimeoutError extends Error {}

export async function submitInquiry(
  db: Firestore,
  input: EnquiryInput,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: SubmitOptions = {},
): Promise<SubmitResult> {
  const result = validateEnquiry(input);
  if (!result.ok) return { ok: false, reason: 'validation', fieldErrors: result.fieldErrors };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const write = addDoc(collection(db, INQUIRIES), {
      ...result.value,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError('Enquiry write timed out')), timeoutMs);
    });
    const ref = await Promise.race([write, timeout]);
    return { ok: true, id: ref.id };
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const reason = typeof code === 'string' && REJECTED_CODES.has(code) ? 'rejected' : 'network';
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
