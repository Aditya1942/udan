/**
 * Admin domain types (see docs/specs/udan-admin.md, "Data model").
 * Pure: no Firestore types. Firestore `Timestamp`s arrive here as JS `Date`s (converted in `src/admin/data/`).
 */

/** Business date `YYYY-MM-DD`, IST. */
export type ISODate = string;
/** Calendar month `YYYY-MM`, IST. */
export type ISOMonth = string;
/** Financial year label, e.g. `2026-27`. */
export type FY = string;
/** Integer INR rupees (no paise). Stored amounts are >= 0; derived amounts may be negative. */
export type INR = number;

export const PAY_MODES = ['Cash', 'UPI', 'Bank transfer', 'Card', 'Cheque', 'Other'] as const;
export type PayMode = (typeof PAY_MODES)[number];

/** In lifecycle order (also the table's Status sort order). */
export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Voucher Received', 'Completed', 'Cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const LINE_TYPES = ['Hotel', 'Transfer', 'Flight', 'Sightseeing', 'Visa', 'Package', 'Other'] as const;
export type LineType = (typeof LINE_TYPES)[number];

export const PAYMENT_KINDS = ['Payment', 'Refund'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export type Pax = { adults: number; children: number; infants: number };

export type ServiceLine = {
  id: string;
  type: LineType;
  dmcId: string;
  description: string;
  /** Absent = "Whole trip". */
  start?: ISODate;
  end?: ISODate;
  netCost: INR;
  confirmationNo?: string;
  voucherNotes?: string;
  dmcPayBy?: ISODate;
  /** Only while the Booking is Cancelled. */
  dmcCancellationCharge?: INR;
};

/** A Client Payment or Refund entry. Amounts are always positive; `kind` gives the direction. */
export type ClientPayment = {
  id: string;
  kind: PaymentKind;
  date: ISODate;
  amount: INR;
  mode: PayMode;
  ref?: string;
  note?: string;
};

/** A DMC Payment (UDAN → DMC) or Refund (DMC → UDAN). */
export type DmcPayment = ClientPayment & { dmcId: string };

export type PaymentEntry = ClientPayment | DmcPayment;

/** Record metadata added by the data layer. Dates are absent only in hand-built test fixtures. */
export type DocMeta = { id: string; createdAt?: Date; updatedAt?: Date };

export type ClientFields = {
  name: string;
  /** E.164; unique across Clients (checked in the UI). */
  mobile: string;
  email?: string;
  city?: string;
  notes?: string;
};
export type Client = DocMeta & ClientFields;

export type DmcFields = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  region?: string;
  notes?: string;
};
export type Dmc = DocMeta & DmcFields;

/** Booking fields the Admin edits through sections (Client, Travel, Price, Service lines, Notes). */
export type BookingEditableFields = {
  clientId: string;
  destination: string;
  travelStart: ISODate;
  travelEnd: ISODate;
  pax: Pax;
  travellerNames: string[];
  itinerary: string;
  internalNotes: string;
  sellingPrice: INR;
  clientBalanceDueBy?: ISODate;
  lines: ServiceLine[];
};

export type BookingFields = BookingEditableFields & {
  /** `UDN-001`; immutable; route key. */
  bookingNo: string;
  /** 1, 2, …; immutable; sort key. */
  bookingSeq: number;
  status: BookingStatus;
  clientPayments: ClientPayment[];
  dmcPayments: DmcPayment[];
  // Set once.
  invoiceNo?: string;
  invoiceSeq?: number;
  invoiceDate?: ISODate;
  enquiryId?: string;
  // Present only while Cancelled.
  cancelledAt?: ISODate;
  cancelReason?: string;
  clientCancellationCharge?: INR;
};
export type Booking = DocMeta & BookingFields;

/** What `createBooking` takes. `clientId` may be empty when a new Client is created in the same write. */
export type BookingDraft = Omit<BookingEditableFields, 'clientId'> & { clientId?: string };

export const ENQUIRY_STATUSES = ['new', 'contacted', 'converted', 'closed'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
/** Statuses the Admin may set by hand (`converted` is set only by conversion). */
export type ManualEnquiryStatus = Exclude<EnquiryStatus, 'converted'>;

/** Public create schema from the website form (`inquiries`). */
export type EnquiryPublicFields = {
  name: string;
  /** E.164 Indian mobile. */
  phone: string;
  /** Service id from `src/content/business.ts`. */
  service: string;
  message: string;
  sourcePage: string;
  destination: string | null;
};

export type EnquiryAdminFields = {
  status: EnquiryStatus;
  adminNotes?: string;
  closeReason?: string;
  clientId?: string;
  /** Booking doc id (not the Booking ID). */
  bookingId?: string;
  convertedAt?: Date;
};

export type Enquiry = DocMeta & EnquiryPublicFields & EnquiryAdminFields;

export const BUSINESS_PROFILE_FIELDS = [
  'tradingName',
  'address',
  'phones',
  'email',
  'website',
  'accountName',
  'accountNumber',
  'ifsc',
  'bankBranch',
  'upiId',
  'invoiceTerms',
  'emergencyContacts',
  'voucherNotes',
  'signature',
] as const;
export type BusinessProfileField = (typeof BUSINESS_PROFILE_FIELDS)[number];

/** `settings/business`; every field optional, documents print only filled fields. */
export type BusinessProfile = Partial<Record<BusinessProfileField, string>> & { updatedAt?: Date };

/** Max length of the signature data URL (rules cap). */
export const SIGNATURE_MAX_CHARS = 140_000;
export const SIGNATURE_PREFIX = 'data:image/png;base64,';
