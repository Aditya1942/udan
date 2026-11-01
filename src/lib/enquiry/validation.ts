/**
 * Pure Enquiry validation and normalisation. No Firebase imports, so the form can use it
 * for inline errors without loading the Firestore SDK. `submitInquiry` re-runs it before writing.
 * Limits mirror `firestore.rules` (inquiries create).
 */
import { isServiceId, type ServiceId } from '../../content/business';

export const LIMITS = {
  nameMin: 2,
  nameMax: 100,
  messageMax: 2000,
  sourcePageMax: 100,
  destinationMax: 100,
} as const;

/** What the form collects. Strings are raw user input. */
export type EnquiryInput = {
  name: string;
  phone: string;
  service: string;
  message?: string;
  /** Route path the Enquiry was sent from, e.g. "/contact". */
  sourcePage: string;
  /** Set when enquiring from a destination card. */
  destination?: string | null;
};

export type EnquiryField = 'name' | 'phone' | 'service' | 'message';
export type FieldErrors = Partial<Record<EnquiryField, string>>;

/** Normalised Enquiry, ready to store (minus status/createdAt). */
export type ValidEnquiry = {
  name: string;
  phone: string;
  service: ServiceId;
  message: string;
  sourcePage: string;
  destination: string | null;
};

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Normalises common Indian mobile formats to E.164 (`+91XXXXXXXXXX`).
 * Accepts spaces, dashes, dots and brackets, with or without +91 / 91 / 0091 / a leading 0.
 * Returns null for anything that isn't a 10-digit Indian mobile number.
 */
export function normalisePhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let national: string;
  if (compact.startsWith('+')) {
    if (!compact.startsWith('+91')) return null;
    national = compact.slice(3);
  } else if (compact.startsWith('0091')) {
    national = compact.slice(4);
  } else if (compact.length === 12 && compact.startsWith('91')) {
    national = compact.slice(2);
  } else if (compact.length === 11 && compact.startsWith('0')) {
    national = compact.slice(1);
  } else {
    national = compact;
  }
  return INDIAN_MOBILE.test(national) ? `+91${national}` : null;
}

export type ValidationResult =
  | { ok: true; value: ValidEnquiry }
  | { ok: false; fieldErrors: FieldErrors };

export function validateEnquiry(input: EnquiryInput): ValidationResult {
  const fieldErrors: FieldErrors = {};

  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) fieldErrors.name = 'Please enter your name.';
  else if (name.length < LIMITS.nameMin) fieldErrors.name = `Name must be at least ${LIMITS.nameMin} characters.`;
  else if (name.length > LIMITS.nameMax) fieldErrors.name = `Name must be ${LIMITS.nameMax} characters or fewer.`;

  const phone = input.phone.trim() ? normalisePhone(input.phone) : null;
  if (!input.phone.trim()) fieldErrors.phone = 'Please enter your phone number.';
  else if (!phone) fieldErrors.phone = 'Enter a valid Indian mobile number, e.g. 98765 43210.';

  const service = input.service;
  if (!isServiceId(service)) fieldErrors.service = 'Please choose a service.';

  const message = (input.message ?? '').trim();
  if (message.length > LIMITS.messageMax) {
    fieldErrors.message = `Message must be ${LIMITS.messageMax.toLocaleString('en-IN')} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0 || !phone || !isServiceId(service)) {
    return { ok: false, fieldErrors };
  }

  const destination = input.destination?.trim().slice(0, LIMITS.destinationMax) || null;
  const sourcePage = input.sourcePage.trim().slice(0, LIMITS.sourcePageMax) || '/';

  return { ok: true, value: { name, phone, service, message, sourcePage, destination } };
}
