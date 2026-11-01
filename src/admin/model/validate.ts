/**
 * Form validation for Booking drafts, Service Lines and payment entries.
 * Rules don't validate inside arrays, so these are the only guard for array contents.
 */
import { isISODate } from './dates';
import { isRupees } from './money';
import {
  LINE_TYPES,
  PAY_MODES,
  PAYMENT_KINDS,
  type BookingEditableFields,
  type ClientFields,
  type ClientPayment,
  type DmcFields,
  type DmcPayment,
  type ServiceLine,
} from './types';

export type Errors<K extends string = string> = Partial<Record<K, string>>;

const isBlank = (v: unknown) => typeof v !== 'string' || !v.trim();

export const E164 = /^\+[1-9]\d{6,14}$/;

export function validateClient(c: Partial<ClientFields>): Errors<keyof ClientFields> {
  const e: Errors<keyof ClientFields> = {};
  if (isBlank(c.name)) e.name = 'Enter a name.';
  if (!c.mobile || !E164.test(c.mobile)) e.mobile = 'Enter a mobile number in +91… format.';
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = 'Enter a valid email.';
  return e;
}

export function validateDmc(d: Partial<DmcFields>): Errors<keyof DmcFields> {
  const e: Errors<keyof DmcFields> = {};
  if (isBlank(d.name)) e.name = 'Enter a name.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = 'Enter a valid email.';
  return e;
}

export type BookingErrorKey = keyof BookingEditableFields | 'pax';

/** Booking-level fields. `requireClient=false` when a new Client is created in the same write. */
export function validateBookingFields(
  b: Partial<BookingEditableFields>,
  { requireClient = true }: { requireClient?: boolean } = {},
): Errors<BookingErrorKey> {
  const e: Errors<BookingErrorKey> = {};
  if (requireClient && isBlank(b.clientId)) e.clientId = 'Choose a Client.';
  if (isBlank(b.destination)) e.destination = 'Enter a destination.';
  if (!isISODate(b.travelStart)) e.travelStart = 'Enter the travel start date.';
  if (!isISODate(b.travelEnd)) e.travelEnd = 'Enter the travel end date.';
  else if (isISODate(b.travelStart) && b.travelEnd < b.travelStart) e.travelEnd = 'Travel end must be on or after the start.';
  if (!isRupees(b.sellingPrice)) e.sellingPrice = 'Enter a whole rupee amount (0 or more).';
  if (b.clientBalanceDueBy !== undefined && !isISODate(b.clientBalanceDueBy)) e.clientBalanceDueBy = 'Enter a valid date.';
  if (b.pax && !(isRupees(b.pax.adults) && isRupees(b.pax.children) && isRupees(b.pax.infants)))
    e.pax = 'Passenger counts must be whole numbers.';
  if (b.lines?.some((l) => Object.keys(validateLine(l)).length)) e.lines = 'Fix the Service Line errors.';
  return e;
}

export function validateLine(l: Partial<ServiceLine>): Errors<keyof ServiceLine> {
  const e: Errors<keyof ServiceLine> = {};
  if (!l.type || !LINE_TYPES.includes(l.type)) e.type = 'Choose a type.';
  if (isBlank(l.dmcId)) e.dmcId = 'Choose a DMC.';
  if (isBlank(l.description)) e.description = 'Enter a description.';
  if (!isRupees(l.netCost)) e.netCost = 'Enter a whole rupee amount (0 or more).';
  if (l.start !== undefined && !isISODate(l.start)) e.start = 'Enter a valid date.';
  if (l.end !== undefined && !isISODate(l.end)) e.end = 'Enter a valid date.';
  else if (l.start && l.end && l.end < l.start) e.end = 'End must be on or after the start.';
  if (l.dmcPayBy !== undefined && !isISODate(l.dmcPayBy)) e.dmcPayBy = 'Enter a valid date.';
  if (l.dmcCancellationCharge !== undefined && !isRupees(l.dmcCancellationCharge))
    e.dmcCancellationCharge = 'Enter a whole rupee amount (0 or more).';
  return e;
}

/** Payments need date, kind, mode, amount > 0. DMC entries need one of `allowedDmcIds` (the Booking's line DMCs). */
export function validatePayment(
  p: Partial<DmcPayment> | Partial<ClientPayment>,
  allowedDmcIds?: readonly string[],
): Errors<keyof DmcPayment> {
  const e: Errors<keyof DmcPayment> = {};
  if (!isISODate(p.date)) e.date = 'Enter a date.';
  if (!p.kind || !PAYMENT_KINDS.includes(p.kind)) e.kind = 'Choose Payment or Refund.';
  if (!p.mode || !PAY_MODES.includes(p.mode)) e.mode = 'Choose a mode.';
  if (!isRupees(p.amount, 1)) e.amount = 'Enter a whole rupee amount above 0.';
  if (allowedDmcIds) {
    const dmcId = (p as Partial<DmcPayment>).dmcId;
    if (!dmcId || !allowedDmcIds.includes(dmcId)) e.dmcId = 'Choose a DMC on this booking.';
  }
  return e;
}

export function hasErrors(e: Errors): boolean {
  return Object.keys(e).length > 0;
}
