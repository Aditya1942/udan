/**
 * Booking page form state (pure): the editable Booking fields plus the Client choice (existing / new),
 * per-section validation, section patches, the money input for the rail, and the New booking draft.
 */
import { normalisePhone } from '../../../lib/enquiry/validation';
import { BOOKING_SECTIONS, type BookingSectionPatch } from '../../data';
import {
  matchClientByMobile,
  newId,
  validateBookingFields,
  validateClient,
  validateLine,
  type Booking,
  type BookingDraft,
  type BookingEditableFields,
  type Client,
  type ClientFields,
  type Errors,
  type ISODate,
  type MoneyInput,
  type ServiceLine,
} from '../../model';

export type SectionKey = keyof typeof BOOKING_SECTIONS;
/** Section order on the page (Client → Travel → Price → Service lines → Notes). */
export const SECTION_KEYS: SectionKey[] = ['client', 'travel', 'price', 'lines', 'notes'];
export const SECTION_TITLES: Record<SectionKey, string> = {
  client: 'Client',
  travel: 'Travel',
  price: 'Price',
  lines: 'Service lines',
  notes: 'Notes',
};

export type ClientMode = 'existing' | 'new';
export type NewClientInput = { name: string; mobile: string; email: string; city: string };

export type BookingForm = BookingEditableFields & { clientMode: ClientMode; newClient: NewClientInput };

const blankNewClient = (): NewClientInput => ({ name: '', mobile: '', email: '', city: '' });

export function formFromBooking(b: Booking): BookingForm {
  return {
    clientId: b.clientId,
    destination: b.destination,
    travelStart: b.travelStart,
    travelEnd: b.travelEnd,
    pax: { ...b.pax },
    travellerNames: [...b.travellerNames],
    itinerary: b.itinerary,
    internalNotes: b.internalNotes,
    sellingPrice: b.sellingPrice,
    clientBalanceDueBy: b.clientBalanceDueBy,
    lines: b.lines.map((l) => ({ ...l })),
    clientMode: 'existing',
    newClient: blankNewClient(),
  };
}

/** Copies one section's saved values into the form (opening or cancelling a section). */
export function resetSection(form: BookingForm, booking: Booking, section: SectionKey): BookingForm {
  const saved = formFromBooking(booking);
  const next: BookingForm = { ...form };
  for (const key of BOOKING_SECTIONS[section]) (next as Record<string, unknown>)[key] = saved[key];
  if (section === 'client') {
    next.clientMode = 'existing';
    next.newClient = blankNewClient();
  }
  return next;
}

export type BlankFormOptions = {
  /** `?start=` prefill for travelStart. */
  start?: ISODate | null;
  /** Prefill from an Enquiry (`enquiryConversion`). */
  conversion?: { matchedClient?: Client; newClient: { name: string; mobile: string }; draft: Partial<BookingDraft> };
  /** `?client=` prefill (New booking from a Client page). Ignored with a conversion. */
  clientId?: string;
};

export function blankForm({ start, conversion, clientId }: BlankFormOptions = {}): BookingForm {
  const draft = conversion?.draft ?? {};
  return {
    clientId: conversion ? (conversion.matchedClient?.id ?? '') : (clientId ?? ''),
    destination: draft.destination ?? '',
    travelStart: start ?? '',
    travelEnd: '',
    pax: { adults: 2, children: 0, infants: 0 },
    travellerNames: [],
    itinerary: '',
    internalNotes: draft.internalNotes ?? '',
    sellingPrice: 0,
    clientBalanceDueBy: undefined,
    lines: [],
    clientMode: conversion && !conversion.matchedClient ? 'new' : 'existing',
    newClient: conversion && !conversion.matchedClient ? { ...blankNewClient(), ...conversion.newClient } : blankNewClient(),
  };
}

export function blankLine(): ServiceLine {
  return { id: newId(), type: 'Hotel', dmcId: '', description: '', netCost: 0 };
}

/** Mobile as typed → E.164 (Indian formats normalised; other `+…` numbers kept, spaces dropped). */
export function toE164(raw: string): string {
  return normalisePhone(raw) ?? raw.trim().replace(/[\s\-.()]/g, '');
}

export function newClientFields(input: NewClientInput): ClientFields {
  return {
    name: input.name.trim(),
    mobile: toE164(input.mobile),
    email: input.email.trim() || undefined,
    city: input.city.trim() || undefined,
  };
}

/** Line errors keyed by line id. */
export type LineErrors = Record<string, Errors<keyof ServiceLine>>;

export type SectionErrors = { fields: Errors; lines: LineErrors };

const pick = (e: Errors, keys: readonly string[]): Errors => Object.fromEntries(Object.entries(e).filter(([k]) => keys.includes(k)));

/** Validation for one section (form values only). `clients` is used for the new Client's mobile uniqueness. */
export function sectionErrors(section: SectionKey, form: BookingForm, clients: readonly Client[]): SectionErrors {
  const lines: LineErrors = {};
  if (section === 'client') {
    if (form.clientMode === 'existing') return { fields: form.clientId ? {} : { clientId: 'Choose a Client.' }, lines };
    const fields: Errors = { ...validateClient(newClientFields(form.newClient)) };
    const mobile = toE164(form.newClient.mobile);
    const taken = !fields.mobile && matchClientByMobile(clients, mobile);
    if (taken) fields.mobile = `${taken.name} already has this mobile. Pick them under Existing.`;
    return { fields, lines };
  }
  if (section === 'lines') {
    for (const l of form.lines) {
      const e = validateLine(l);
      if (Object.keys(e).length) lines[l.id] = e;
    }
    return { fields: {}, lines };
  }
  const all = validateBookingFields(form, { requireClient: false });
  const keys: readonly string[] = section === 'travel' ? [...BOOKING_SECTIONS.travel, 'pax'] : BOOKING_SECTIONS[section];
  return { fields: pick(all, keys), lines };
}

export function isValid(e: SectionErrors): boolean {
  return Object.keys(e.fields).length === 0 && Object.keys(e.lines).length === 0;
}

/** The patch one section Save writes (`clientBalanceDueBy: undefined` removes the field). */
export function sectionPatch(section: SectionKey, form: BookingForm): BookingSectionPatch {
  const patch: Record<string, unknown> = {};
  for (const key of BOOKING_SECTIONS[section]) patch[key] = form[key];
  if (section === 'travel') patch.destination = form.destination.trim();
  if (section === 'price') patch.clientBalanceDueBy = form.clientBalanceDueBy || undefined;
  if (section === 'lines') patch.lines = form.lines.map(trimLine);
  return patch as BookingSectionPatch;
}

function trimLine(l: ServiceLine): ServiceLine {
  const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  return {
    ...l,
    description: l.description.trim(),
    start: opt(l.start),
    end: opt(l.end),
    confirmationNo: opt(l.confirmationNo),
    voucherNotes: opt(l.voucherNotes),
    dmcPayBy: opt(l.dmcPayBy),
  };
}

/** Saved Booking with the open sections' unsaved values laid over it (the Money rail recomputes from this). */
export function liveMoneyInput(booking: Booking | undefined, form: BookingForm, open: ReadonlySet<SectionKey>): MoneyInput {
  const base: MoneyInput = booking ?? { status: 'Pending', sellingPrice: 0, lines: [], clientPayments: [], dmcPayments: [] };
  return {
    ...base,
    sellingPrice: open.has('price') || !booking ? form.sellingPrice : base.sellingPrice,
    lines: open.has('lines') || !booking ? form.lines : base.lines,
  };
}

/** New booking → `createBooking` arguments. */
export function toCreateArgs(form: BookingForm): { draft: BookingDraft; newClient?: ClientFields } {
  const patch = { ...sectionPatch('travel', form), ...sectionPatch('price', form), ...sectionPatch('lines', form), ...sectionPatch('notes', form) };
  const draft: BookingDraft = {
    destination: form.destination.trim(),
    travelStart: form.travelStart,
    travelEnd: form.travelEnd,
    pax: form.pax,
    travellerNames: form.travellerNames,
    itinerary: form.itinerary,
    internalNotes: form.internalNotes,
    sellingPrice: form.sellingPrice,
    clientBalanceDueBy: patch.clientBalanceDueBy,
    lines: patch.lines ?? [],
    clientId: form.clientMode === 'existing' ? form.clientId : undefined,
  };
  return { draft, newClient: form.clientMode === 'new' ? newClientFields(form.newClient) : undefined };
}
