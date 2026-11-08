/**
 * Booking page form state (pure): the editable Booking fields plus the Client choice (existing / new),
 * per-section validation, section patches, the money input for the rail, and the New booking draft.
 */
import { normalisePhone } from '../../../lib/enquiry/validation';
import { BOOKING_SECTIONS, type BookingSectionPatch } from '../../data';
import {
  divisionOf,
  isSingleService,
  matchClientByMobile,
  newId,
  untagStalePayments,
  validateBookingFields,
  validateClient,
  validateLine,
  type Booking,
  type BookingCategory,
  type BookingDraft,
  type BookingEditableFields,
  type Client,
  type ClientFields,
  type EnquiryConversion,
  type Errors,
  type ISODate,
  type LineType,
  type MoneyInput,
  type ServiceLine,
} from '../../model';

export type SectionKey = keyof typeof BOOKING_SECTIONS;
/** Section order on the page (Customer → Service → Travel → Travellers → Price → Notes). */
export const SECTION_KEYS: SectionKey[] = ['client', 'service', 'travel', 'travellers', 'price', 'notes'];
export const SECTION_TITLES: Record<SectionKey, string> = {
  client: 'Customer',
  service: 'Service',
  travel: 'Travel',
  travellers: 'Travellers',
  price: 'Price',
  notes: 'Notes',
};

export type ClientMode = 'existing' | 'new';
export type NewClientInput = { name: string; mobile: string; email: string; city: string };

/** `category: ''` until the Admin picks one. */
export type BookingForm = Omit<BookingEditableFields, 'category'> & {
  category: BookingCategory | '';
  clientMode: ClientMode;
  newClient: NewClientInput;
};

const isImmigration = (form: BookingForm) => !!form.category && divisionOf(form.category) === 'Immigration';

/** Sections shown on the page; Travel is hidden for Visa/Passport (Immigration has no travel details). */
export function visibleSections(form: BookingForm): SectionKey[] {
  return SECTION_KEYS.filter((k) => k !== 'travel' || !isImmigration(form));
}

/** Travel details a Visa/Passport save writes: none. */
const NO_TRAVEL = { hasTravel: false, destination: '', travelStart: undefined, travelEnd: undefined, itinerary: '' } as const;

const blankNewClient = (): NewClientInput => ({ name: '', mobile: '', email: '', city: '' });

export function formFromBooking(b: Booking): BookingForm {
  return {
    clientId: b.clientId,
    category: b.category,
    tripScope: b.tripScope,
    hasTravel: b.hasTravel,
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
  conversion?: EnquiryConversion;
  /** `?client=` prefill (New booking from a Client page). Ignored with a conversion. */
  clientId?: string;
};

export function blankForm({ start, conversion, clientId }: BlankFormOptions = {}): BookingForm {
  const draft = conversion?.draft ?? {};
  const form: BookingForm = {
    clientId: conversion ? (conversion.matchedClient?.id ?? '') : (clientId ?? ''),
    category: '',
    hasTravel: !!start || !!draft.destination?.trim(),
    destination: draft.destination ?? '',
    travelStart: start ?? '',
    travelEnd: '',
    pax: { adults: 1, children: 0, infants: 0 },
    travellerNames: [],
    itinerary: '',
    internalNotes: draft.internalNotes ?? '',
    sellingPrice: 0,
    clientBalanceDueBy: undefined,
    lines: [],
    clientMode: conversion && !conversion.matchedClient ? 'new' : 'existing',
    newClient: conversion && !conversion.matchedClient ? { ...blankNewClient(), ...conversion.newClient } : blankNewClient(),
  };
  return conversion?.category ? setCategory(form, conversion.category) : form;
}

export function blankLine(type: LineType = 'Hotel'): ServiceLine {
  return { id: newId(), type, description: '', netCost: 0 };
}

/** Package → single is only possible while there is at most one line to keep. */
export function canSetCategory(form: BookingForm, c: BookingCategory): boolean {
  return !(form.category === 'Package' && isSingleService(c) && form.lines.length > 1);
}

function retype(l: ServiceLine, type: LineType): ServiceLine {
  const { visaType, visaCountry, ...rest } = l;
  return type === 'Visa' ? { ...l, type } : { ...rest, type };
}

/** Picks the Category and shapes the lines to match; returns `form` unchanged when not allowed. */
export function setCategory(form: BookingForm, c: BookingCategory): BookingForm {
  if (!canSetCategory(form, c)) return form;
  const lines = !form.category
    ? [firstLine(form, c)]
    : isSingleService(c)
      ? [retype(form.lines[0] ?? blankLine(c), c)]
      : form.lines;
  // Visa/Passport have no travel details; the typed values stay in the form if the Admin switches back.
  const hasTravel = divisionOf(c) === 'Immigration' ? false : form.hasTravel;
  return { ...form, category: c, tripScope: c === 'Package' ? form.tripScope : undefined, hasTravel, lines };
}

/** First line for a new Category; a Visa line takes the prefilled destination (e.g. from an Enquiry) as its Country. */
function firstLine(form: BookingForm, c: BookingCategory): ServiceLine {
  const line = blankLine(isSingleService(c) ? c : 'Hotel');
  const country = form.destination.trim();
  return c === 'Visa' && country ? { ...line, visaCountry: country } : line;
}

/** "Add service" on a single-service Booking: it becomes a Package with one more line. */
export function addService(form: BookingForm): BookingForm {
  return { ...form, category: 'Package', lines: [...form.lines, blankLine()] };
}

export function setTravel(form: BookingForm, on: boolean): BookingForm {
  return { ...form, hasTravel: on };
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
    if (form.clientMode === 'existing') return { fields: form.clientId ? {} : { clientId: 'Choose a Customer.' }, lines };
    const fields: Errors = { ...validateClient(newClientFields(form.newClient)) };
    const mobile = toE164(form.newClient.mobile);
    const taken = !fields.mobile && matchClientByMobile(clients, mobile);
    if (taken) fields.mobile = `${taken.name} already has this mobile. Pick them under Existing.`;
    return { fields, lines };
  }
  if (section === 'travel' && !form.hasTravel) return { fields: {}, lines };
  if (section === 'service') {
    for (const l of form.lines) {
      const e = validateLine(l);
      if (Object.keys(e).length) lines[l.id] = e;
    }
  }
  const all = validateBookingFields({ ...form, category: form.category || undefined }, { requireClient: false });
  return { fields: pick(all, BOOKING_SECTIONS[section]), lines };
}

export function isValid(e: SectionErrors): boolean {
  return Object.keys(e.fields).length === 0 && Object.keys(e.lines).length === 0;
}

/** The patch one section Save writes (`clientBalanceDueBy: undefined` removes the field). */
export function sectionPatch(section: SectionKey, form: BookingForm): BookingSectionPatch {
  const patch: Record<string, unknown> = {};
  for (const key of BOOKING_SECTIONS[section]) patch[key] = form[key];
  if (section === 'service') {
    patch.tripScope = form.category === 'Package' ? form.tripScope : undefined;
    patch.lines = form.lines.map(trimLine);
    if (isImmigration(form)) Object.assign(patch, NO_TRAVEL);
  }
  if (section === 'travel') {
    if (form.hasTravel) patch.destination = form.destination.trim();
    else Object.assign(patch, NO_TRAVEL);
  }
  if (section === 'price') patch.clientBalanceDueBy = form.clientBalanceDueBy || undefined;
  return patch as BookingSectionPatch;
}

function trimLine(l: ServiceLine): ServiceLine {
  const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const visa = l.type === 'Visa';
  const dmcId = opt(l.dmcId);
  return {
    ...l,
    dmcId,
    visaType: visa ? l.visaType : undefined,
    visaCountry: visa ? opt(l.visaCountry) : undefined,
    description: l.description.trim(),
    start: opt(l.start),
    end: opt(l.end),
    confirmationNo: opt(l.confirmationNo),
    voucherNotes: opt(l.voucherNotes),
    dmcPayBy: dmcId ? opt(l.dmcPayBy) : undefined,
  };
}

/** Saved Booking with the open sections' unsaved values laid over it (the Money rail recomputes from this). */
export function liveMoneyInput(booking: Booking | undefined, form: BookingForm, open: ReadonlySet<SectionKey>): MoneyInput {
  const base: MoneyInput = booking ?? { status: 'Pending', sellingPrice: 0, lines: [], clientPayments: [], dmcPayments: [] };
  return {
    ...base,
    sellingPrice: open.has('price') || !booking ? form.sellingPrice : base.sellingPrice,
    lines: open.has('service') || !booking ? form.lines : base.lines,
  };
}

/** New booking → `createBooking` arguments. */
export function toCreateArgs(form: BookingForm): { draft: BookingDraft; newClient?: ClientFields } {
  const patch = { ...sectionPatch('travel', form), ...sectionPatch('price', form), ...sectionPatch('service', form), ...sectionPatch('notes', form) };
  const draft: BookingDraft = {
    category: form.category as BookingCategory,
    tripScope: patch.tripScope,
    hasTravel: patch.hasTravel ?? form.hasTravel,
    destination: patch.destination ?? '',
    travelStart: patch.travelStart ?? '',
    travelEnd: patch.travelEnd ?? '',
    pax: form.pax,
    travellerNames: form.travellerNames,
    itinerary: patch.itinerary ?? '',
    internalNotes: form.internalNotes,
    sellingPrice: form.sellingPrice,
    clientBalanceDueBy: patch.clientBalanceDueBy,
    lines: patch.lines ?? [],
    clientId: form.clientMode === 'existing' ? form.clientId : undefined,
  };
  return { draft, newClient: form.clientMode === 'new' ? newClientFields(form.newClient) : undefined };
}

/** Note shown before saving the Service section when DMC Payments would lose their service tag. */
export function untagWarning(booking: Booking, form: BookingForm): string | null {
  const n = untagStalePayments(booking, form.lines).untagged.dmc;
  return n ? `${n} DMC payment${n === 1 ? '' : 's'} tagged to a changed service will stay with the old DMC, untagged.` : null;
}
