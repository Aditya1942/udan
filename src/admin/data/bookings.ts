/**
 * Booking writes. Every write stamps `updatedAt`; Booking ID / invoice number allocation and
 * read-modify-write list changes run in transactions so concurrent Admins can't clash.
 */
import {
  collection,
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Transaction,
} from 'firebase/firestore';
import {
  BOOKING_COUNTER_ID,
  formatBookingNo,
  formatInvoiceNo,
  invoiceSeries,
  lineDmcIds,
  newId,
  todayIST,
  untagStalePayments,
  validatePayment,
  type Booking,
  type BookingDraft,
  type BookingEditableFields,
  type BookingStatus,
  type ClientFields,
  type ClientPayment,
  type DmcPayment,
  type INR,
  type ISODate,
  type ServiceLine,
} from '../model';
import { bookingFromDoc, clean, COLLECTIONS, toUpdate } from './convert';
import { clientCreateData } from './directory';
import { AdminDataError, run } from './errors';

const OPTIONAL_BOOKING_KEYS = ['clientBalanceDueBy', 'travelStart', 'travelEnd', 'tripScope'] as const;

async function readBooking(tx: Transaction, db: Firestore, bookingId: string): Promise<Booking> {
  const snap = await tx.get(doc(db, COLLECTIONS.bookings, bookingId));
  if (!snap.exists()) throw new AdminDataError('conflict', `Booking ${bookingId} not found`);
  return bookingFromDoc(snap.id, snap.data());
}

/** Reads a counter in a transaction and returns its next seq (1 when missing). Write it with `writeCounter`. */
async function bumpCounter(tx: Transaction, db: Firestore, counterId: string): Promise<number> {
  const ref = doc(db, COLLECTIONS.counters, counterId);
  const snap = await tx.get(ref);
  const seq = snap.exists() ? (snap.data().seq as number) + 1 : 1;
  return seq;
}

function writeCounter(tx: Transaction, db: Firestore, counterId: string, seq: number) {
  tx.set(doc(db, COLLECTIONS.counters, counterId), { seq });
}

export type CreateBookingOptions = {
  /** Create this Client in the same transaction and link it (overrides `draft.clientId`). */
  newClient?: ClientFields;
  /** Mark this Enquiry converted in the same transaction. */
  enquiryId?: string;
};

export type CreatedBooking = { id: string; bookingNo: string; bookingSeq: number; clientId: string };

/**
 * New booking: one transaction that bumps `counters/booking`, creates the Client (if new), creates the
 * Booking (status Pending, no payments) and converts the Enquiry (if any). Nothing is written on failure.
 */
export function createBooking(db: Firestore, draft: BookingDraft, opts: CreateBookingOptions = {}): Promise<CreatedBooking> {
  return run(() =>
    runTransaction(db, async (tx) => {
      const bookingRef = doc(collection(db, COLLECTIONS.bookings));
      const enquiryRef = opts.enquiryId ? doc(db, COLLECTIONS.inquiries, opts.enquiryId) : null;

      // Reads first.
      const seq = await bumpCounter(tx, db, BOOKING_COUNTER_ID);
      if (enquiryRef) {
        const enquiry = await tx.get(enquiryRef);
        if (!enquiry.exists()) throw new AdminDataError('conflict', 'Enquiry not found');
        if (enquiry.data().status === 'converted') throw new AdminDataError('conflict', 'Enquiry already converted');
      }

      let clientId = draft.clientId ?? '';
      writeCounter(tx, db, BOOKING_COUNTER_ID, seq);
      if (opts.newClient) {
        const clientRef = doc(collection(db, COLLECTIONS.clients));
        clientId = clientRef.id;
        tx.set(clientRef, clientCreateData(opts.newClient));
      }
      if (!clientId) throw new AdminDataError('conflict', 'A Booking needs a Customer');

      const bookingNo = formatBookingNo(seq);
      tx.set(
        bookingRef,
        clean({
          ...draft,
          clientId,
          clientBalanceDueBy: draft.clientBalanceDueBy || undefined,
          travelStart: draft.travelStart || undefined,
          travelEnd: draft.travelEnd || undefined,
          bookingNo,
          bookingSeq: seq,
          status: 'Pending' satisfies BookingStatus,
          clientPayments: [],
          dmcPayments: [],
          ...(opts.enquiryId ? { enquiryId: opts.enquiryId } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      if (enquiryRef) {
        tx.update(enquiryRef, {
          status: 'converted',
          clientId,
          bookingId: bookingRef.id,
          convertedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return { id: bookingRef.id, bookingNo, bookingSeq: seq, clientId };
    }),
  );
}

export type InvoiceNumber = { invoiceNo: string; invoiceSeq: number; invoiceDate: ISODate };

/**
 * First Prepare of the Invoice: allocates `UDAN/<FY>/<seq>` from `counters/invoice-<FY>` (FY of today, IST)
 * in one transaction with the Booking update. Idempotent: an invoiced Booking returns its stored number and date.
 */
export function allocateInvoiceNo(
  db: Firestore,
  bookingId: string,
  { today = todayIST() }: { today?: ISODate } = {},
): Promise<InvoiceNumber & { allocated: boolean }> {
  return run(() =>
    runTransaction(db, async (tx) => {
      const booking = await readBooking(tx, db, bookingId);
      if (booking.invoiceNo && booking.invoiceSeq && booking.invoiceDate) {
        return { invoiceNo: booking.invoiceNo, invoiceSeq: booking.invoiceSeq, invoiceDate: booking.invoiceDate, allocated: false };
      }
      const { fy, counterId } = invoiceSeries(today);
      const invoiceSeq = await bumpCounter(tx, db, counterId);
      const invoiceNo = formatInvoiceNo(fy, invoiceSeq);
      writeCounter(tx, db, counterId, invoiceSeq);
      tx.update(doc(db, COLLECTIONS.bookings, bookingId), { invoiceNo, invoiceSeq, invoiceDate: today, updatedAt: serverTimestamp() });
      return { invoiceNo, invoiceSeq, invoiceDate: today, allocated: true };
    }),
  );
}

/** Fields one section Save may write (Customer, Service, Travel, Travellers, Price, Notes). */
export type BookingSectionPatch = Partial<BookingEditableFields>;

/** Section keys, for building patches from form state. */
export const BOOKING_SECTIONS = {
  client: ['clientId'],
  service: ['category', 'tripScope', 'lines'],
  travel: ['hasTravel', 'destination', 'travelStart', 'travelEnd', 'itinerary'],
  travellers: ['pax', 'travellerNames'],
  price: ['sellingPrice', 'clientBalanceDueBy'],
  notes: ['internalNotes'],
} as const satisfies Record<string, readonly (keyof BookingEditableFields)[]>;

/**
 * Section Save: one write of the section's fields + updatedAt. A key present with value `undefined`
 * (e.g. clearing `clientBalanceDueBy`) removes the field. With `newClient`, the Client is created in the same batch.
 */
export function saveBookingSection(
  db: Firestore,
  bookingId: string,
  patch: BookingSectionPatch,
  { newClient }: { newClient?: ClientFields } = {},
): Promise<{ clientId?: string }> {
  return run(async () => {
    const batch = writeBatch(db);
    const data: Record<string, unknown> = { ...patch };
    let clientId: string | undefined;
    if (newClient) {
      const clientRef = doc(collection(db, COLLECTIONS.clients));
      clientId = clientRef.id;
      batch.set(clientRef, clientCreateData(newClient));
      data.clientId = clientId;
    }
    batch.update(doc(db, COLLECTIONS.bookings, bookingId), { ...toUpdate(data, OPTIONAL_BOOKING_KEYS), updatedAt: serverTimestamp() });
    await batch.commit();
    return { clientId };
  });
}

/** Visa/Passport saves also clear the travel details (`hasTravel: false`, travel keys removed). */
export type ServiceSectionPatch = Pick<BookingEditableFields, 'category' | 'tripScope' | 'lines'> &
  Partial<Pick<BookingEditableFields, 'hasTravel' | 'destination' | 'travelStart' | 'travelEnd' | 'itinerary'>>;

/**
 * Service section Save: one transaction writes Category, Trip Scope and lines (plus the travel clear for Visa/Passport), and drops payment tags that
 * the new lines make stale (deleted line, or a DMC Payment whose line changed DMC). Payments stay; `untagged` counts them.
 */
export function saveServiceSection(
  db: Firestore,
  bookingId: string,
  patch: ServiceSectionPatch,
): Promise<{ untagged: { client: number; dmc: number } }> {
  return run(() =>
    runTransaction(db, async (tx) => {
      const booking = await readBooking(tx, db, bookingId);
      const { clientPayments, dmcPayments, untagged } = untagStalePayments(booking, patch.lines);
      tx.update(doc(db, COLLECTIONS.bookings, bookingId), {
        ...toUpdate({ ...patch }, OPTIONAL_BOOKING_KEYS),
        ...(untagged.client ? { clientPayments: clean(clientPayments) } : {}),
        ...(untagged.dmc ? { dmcPayments: clean(dmcPayments) } : {}),
        updatedAt: serverTimestamp(),
      });
      return { untagged };
    }),
  );
}

const CANCEL_FIELDS = { cancelledAt: deleteField(), cancelReason: deleteField(), clientCancellationCharge: deleteField() };

function withoutCancellationCharges(lines: ServiceLine[]): ServiceLine[] {
  return lines.map(({ dmcCancellationCharge: _drop, ...line }) => line);
}

/**
 * Status select. Any status may move to any other, except → Cancelled (use `cancelBooking`).
 * Leaving Cancelled un-cancels: clears cancellation fields and every line's DMC Cancellation Charge.
 */
export function setStatus(db: Firestore, bookingId: string, status: Exclude<BookingStatus, 'Cancelled'>): Promise<void> {
  if ((status as BookingStatus) === 'Cancelled') return Promise.reject(new Error('Use cancelBooking() to cancel'));
  return run(() =>
    runTransaction(db, async (tx) => {
      const booking = await readBooking(tx, db, bookingId);
      const ref = doc(db, COLLECTIONS.bookings, bookingId);
      if (booking.status === 'Cancelled') {
        tx.update(ref, { status, ...CANCEL_FIELDS, lines: clean(withoutCancellationCharges(booking.lines)), updatedAt: serverTimestamp() });
      } else {
        tx.update(ref, { status, updatedAt: serverTimestamp() });
      }
    }),
  );
}

/** Un-cancel to `status` (default Confirmed). Refund entries stay. */
export function uncancelBooking(
  db: Firestore,
  bookingId: string,
  status: Exclude<BookingStatus, 'Cancelled'> = 'Confirmed',
): Promise<void> {
  return setStatus(db, bookingId, status);
}

export type CancelInput = {
  reason: string;
  /** Default 0. */
  clientCancellationCharge?: INR;
  /** DMC Cancellation Charge per line id; missing lines default to 0. */
  lineCharges?: Record<string, INR>;
  /** `cancelledAt`, default today (IST). */
  today?: ISODate;
};

/** Cancel dialog: sets status, cancelledAt, cancelReason, Client and per-line DMC Cancellation Charges in one write. */
export function cancelBooking(db: Firestore, bookingId: string, input: CancelInput): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) return Promise.reject(new Error('A cancellation reason is required'));
  return run(() =>
    runTransaction(db, async (tx) => {
      const booking = await readBooking(tx, db, bookingId);
      tx.update(doc(db, COLLECTIONS.bookings, bookingId), {
        status: 'Cancelled',
        cancelledAt: input.today ?? todayIST(),
        cancelReason: reason,
        clientCancellationCharge: input.clientCancellationCharge ?? 0,
        lines: clean(booking.lines.map((l) => ({ ...l, dmcCancellationCharge: input.lineCharges?.[l.id] ?? 0 }))),
        updatedAt: serverTimestamp(),
      });
    }),
  );
}

/* ---------------- payment entries ---------------- */

export type PaymentSide = 'client' | 'dmc';
type Entry<S extends PaymentSide> = S extends 'client' ? ClientPayment : DmcPayment;
const listKey = (side: PaymentSide) => (side === 'client' ? 'clientPayments' : 'dmcPayments');

/** Read-modify-write of one payment list (the whole array is written). */
function editPayments<S extends PaymentSide>(
  db: Firestore,
  bookingId: string,
  side: S,
  edit: (entries: Entry<S>[], booking: Booking) => Entry<S>[],
): Promise<void> {
  return run(() =>
    runTransaction(db, async (tx) => {
      const booking = await readBooking(tx, db, bookingId);
      const key = listKey(side);
      const next = edit([...(booking[key] as Entry<S>[])], booking);
      tx.update(doc(db, COLLECTIONS.bookings, bookingId), { [key]: clean(next), updatedAt: serverTimestamp() });
    }),
  );
}

function checkDmc(booking: Booking, entry: Partial<DmcPayment>) {
  if (!entry.dmcId || !lineDmcIds(booking).includes(entry.dmcId))
    throw new AdminDataError('conflict', 'That DMC is no longer on this booking');
}

function checkLine(booking: Booking, entry: Partial<ClientPayment>) {
  if (validatePayment(entry, undefined, booking.lines).lineId)
    throw new AdminDataError('conflict', 'That service is no longer on this booking');
}

export async function addPayment<S extends PaymentSide>(
  db: Firestore,
  bookingId: string,
  side: S,
  entry: Omit<Entry<S>, 'id'>,
): Promise<string> {
  const id = newId();
  await editPayments(db, bookingId, side, (entries, booking) => {
    if (side === 'dmc') checkDmc(booking, entry as Partial<DmcPayment>);
    checkLine(booking, entry);
    return [...entries, { ...entry, id } as Entry<S>];
  });
  return id;
}

export function updatePayment<S extends PaymentSide>(db: Firestore, bookingId: string, side: S, entry: Entry<S>): Promise<void> {
  return editPayments(db, bookingId, side, (entries, booking) => {
    const i = entries.findIndex((e) => e.id === entry.id);
    if (i < 0) throw new AdminDataError('conflict', 'That entry no longer exists');
    const prev = entries[i] as Partial<DmcPayment>;
    if (side === 'dmc' && prev.dmcId !== (entry as DmcPayment).dmcId) checkDmc(booking, entry as DmcPayment);
    checkLine(booking, entry);
    entries[i] = entry;
    return entries;
  });
}

export function deletePayment(db: Firestore, bookingId: string, side: PaymentSide, entryId: string): Promise<void> {
  return editPayments(db, bookingId, side, (entries) => entries.filter((e) => e.id !== entryId));
}

export const addClientPayment = (db: Firestore, bookingId: string, entry: Omit<ClientPayment, 'id'>) =>
  addPayment(db, bookingId, 'client', entry);
export const updateClientPayment = (db: Firestore, bookingId: string, entry: ClientPayment) =>
  updatePayment(db, bookingId, 'client', entry);
export const deleteClientPayment = (db: Firestore, bookingId: string, entryId: string) =>
  deletePayment(db, bookingId, 'client', entryId);
export const addDmcPayment = (db: Firestore, bookingId: string, entry: Omit<DmcPayment, 'id'>) =>
  addPayment(db, bookingId, 'dmc', entry);
export const updateDmcPayment = (db: Firestore, bookingId: string, entry: DmcPayment) =>
  updatePayment(db, bookingId, 'dmc', entry);
export const deleteDmcPayment = (db: Firestore, bookingId: string, entryId: string) =>
  deletePayment(db, bookingId, 'dmc', entryId);
