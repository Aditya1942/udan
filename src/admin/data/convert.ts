/** Firestore document data → model objects (Timestamps → Date, defaults for missing fields), and write helpers. */
import { deleteField, Timestamp, type DocumentData, type FieldValue } from 'firebase/firestore';
import type { Booking, BusinessProfile, Client, Dmc, Enquiry } from '../model';
import { BOOKING_CATEGORIES, BUSINESS_PROFILE_FIELDS, TRIP_SCOPES } from '../model';

export const COLLECTIONS = {
  clients: 'clients',
  dmcs: 'dmcs',
  bookings: 'bookings',
  counters: 'counters',
  settings: 'settings',
  config: 'config',
  inquiries: 'inquiries',
} as const;

export const BUSINESS_DOC = 'business';

function toDate(v: unknown): Date | undefined {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return undefined;
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const arr = <T>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

/** Drops undefined values (recursively in plain objects and arrays); Firestore rejects them. */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = clean(v);
    return out as T;
  }
  return value;
}

/** For updates: undefined (or blank optional strings) → deleteField(); everything else cleaned. */
export function toUpdate(patch: Record<string, unknown>, optionalKeys: readonly string[] = []): Record<string, unknown | FieldValue> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const blank = v === undefined || (optionalKeys.includes(k) && typeof v === 'string' && !v.trim());
    out[k] = blank ? deleteField() : clean(typeof v === 'string' && optionalKeys.includes(k) ? v.trim() : v);
  }
  return out;
}

/** For creates: drop undefined and blank optional strings, trim optional strings. */
export function toCreate<T extends Record<string, unknown>>(data: T, optionalKeys: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (optionalKeys.includes(k) && typeof v === 'string') {
      if (v.trim()) out[k] = v.trim();
      continue;
    }
    out[k] = clean(v);
  }
  return out;
}

export function clientFromDoc(id: string, d: DocumentData): Client {
  return {
    id,
    name: str(d.name) ?? '',
    mobile: str(d.mobile) ?? '',
    email: str(d.email),
    whatsappSameAsMobile: d.whatsappSameAsMobile === true ? true : undefined,
    whatsapp: str(d.whatsapp),
    address: str(d.address),
    city: str(d.city),
    state: str(d.state),
    country: str(d.country),
    emergencyName: str(d.emergencyName),
    emergencyPhone: str(d.emergencyPhone),
    gstin: str(d.gstin),
    pan: str(d.pan),
    notes: str(d.notes),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export function dmcFromDoc(id: string, d: DocumentData): Dmc {
  return {
    id,
    name: str(d.name) ?? '',
    contactPerson: str(d.contactPerson),
    phone: str(d.phone),
    email: str(d.email),
    region: str(d.region),
    notes: str(d.notes),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

export function bookingFromDoc(id: string, d: DocumentData): Booking {
  const pax = (d.pax ?? {}) as Partial<Booking['pax']>;
  return clean({
    id,
    bookingNo: str(d.bookingNo) ?? '',
    bookingSeq: typeof d.bookingSeq === 'number' ? d.bookingSeq : 0,
    clientId: str(d.clientId) ?? '',
    contactName: str(d.contactName),
    contactPhone: str(d.contactPhone),
    status: d.status ?? 'Pending',
    category: BOOKING_CATEGORIES.find((c) => c === d.category) ?? 'Package',
    tripScope: TRIP_SCOPES.find((t) => t === d.tripScope),
    hasTravel: d.hasTravel !== false,
    destination: str(d.destination) ?? '',
    travelStart: str(d.travelStart) ?? '',
    travelEnd: str(d.travelEnd) ?? '',
    pax: { adults: pax.adults ?? 0, children: pax.children ?? 0, infants: pax.infants ?? 0 },
    travellerNames: arr<string>(d.travellerNames),
    itinerary: str(d.itinerary) ?? '',
    internalNotes: str(d.internalNotes) ?? '',
    sellingPrice: typeof d.sellingPrice === 'number' ? d.sellingPrice : 0,
    clientBalanceDueBy: str(d.clientBalanceDueBy),
    lines: arr(d.lines),
    clientPayments: arr(d.clientPayments),
    dmcPayments: arr(d.dmcPayments),
    invoiceNo: str(d.invoiceNo),
    invoiceSeq: typeof d.invoiceSeq === 'number' ? d.invoiceSeq : undefined,
    invoiceDate: str(d.invoiceDate),
    enquiryId: str(d.enquiryId),
    cancelledAt: str(d.cancelledAt),
    cancelReason: str(d.cancelReason),
    clientCancellationCharge: typeof d.clientCancellationCharge === 'number' ? d.clientCancellationCharge : undefined,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  }) as Booking;
}

export function enquiryFromDoc(id: string, d: DocumentData): Enquiry {
  return clean({
    id,
    name: str(d.name) ?? '',
    phone: str(d.phone) ?? '',
    service: str(d.service) ?? '',
    message: str(d.message) ?? '',
    sourcePage: str(d.sourcePage) ?? '',
    destination: str(d.destination) ?? null,
    status: d.status ?? 'new',
    adminNotes: str(d.adminNotes),
    closeReason: str(d.closeReason),
    clientId: str(d.clientId),
    bookingId: str(d.bookingId),
    convertedAt: toDate(d.convertedAt),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  }) as Enquiry;
}

export function businessProfileFromDoc(d: DocumentData): BusinessProfile {
  const out: BusinessProfile = {};
  for (const k of BUSINESS_PROFILE_FIELDS) if (typeof d[k] === 'string') out[k] = d[k];
  const updatedAt = toDate(d.updatedAt);
  if (updatedAt) out.updatedAt = updatedAt;
  return out;
}
