/**
 * Invoice and Voucher view-models (spec: "Documents: Invoice and Voucher PDFs"). Pure: no react-pdf, no Firestore.
 * Every line, label, total and visibility decision the templates print is decided here, so it can be unit-tested;
 * the templates only lay it out. The Business profile prints only filled fields.
 *
 * The Voucher builder never receives DMCs and copies only customer-facing line fields: no DMC name, cost or payment.
 */
import {
  bookingMoney,
  formatDate,
  formatINR,
  normaliseBusinessProfile,
  type Booking,
  type BusinessProfile,
  type Client,
  type INR,
  type ISODate,
  type LineType,
  type Pax,
} from '../model';

/* ------------------------------- helpers ------------------------------- */

/** `+919811111111` → `+91 98111 11111`; anything else is returned as stored. */
export function displayMobile(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

export function paxLine(p: Pax): string {
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : '');
  return [part(p.adults, 'adult', 'adults'), part(p.children, 'child', 'children'), part(p.infants, 'infant', 'infants')].filter(Boolean).join(', ');
}

/** `18 Dec 2026 – 24 Dec 2026`, or one date when start = end. */
export function dateRangeText(start?: ISODate, end?: ISODate): string {
  if (!start) return '';
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

const textLines = (text?: string) => (text ? text.split('\n').map((l) => l.trim()).filter(Boolean) : []);
/** Phones are one free-text field: one per line or comma-separated. */
const phoneList = (text?: string) => (text ? text.split(/[\n,]/).map((l) => l.trim()).filter(Boolean) : []);

/** `upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…` for the balance (spec: Payment details). */
export function upiPayUri({ upiId, payee, amount, note }: { upiId: string; payee?: string; amount: INR; note: string }): string {
  const params = [`pa=${encodeURIComponent(upiId)}`];
  if (payee) params.push(`pn=${encodeURIComponent(payee)}`);
  params.push(`am=${amount}`, 'cu=INR', `tn=${encodeURIComponent(note)}`);
  return `upi://pay?${params.join('&')}`;
}

/* -------------------------------- Invoice -------------------------------- */

export type Tone = 'danger' | 'action' | 'warn';

export type InvoiceView = {
  invoiceNo: string;
  /** `Date 1 Nov 2026`. */
  dateLine: string;
  /** `Booking UDN-001`. */
  bookingLine: string;
  /** Outlined red "CANCELLED" pill by the title. */
  cancelledPill: boolean;
  /** Red sentence under the addresses (Cancelled only). */
  cancelledNote?: string;
  billedTo: { name: string; lines: string[] };
  /** Trading name + address, phones, email, website (filled only). */
  from: { name?: string; lines: string[] };
  /** The one priced row. */
  item: { title: string; detail: string; amount: string };
  /** Service Lines in order: type, description, dates — never prices, never the DMC. */
  services: { type: LineType; description: string; dates: string }[];
  /** Cancelled: service rows and the original package price are struck through. */
  servicesStruck: boolean;
  originalPrice?: { label: string; amount: string };
  totals: {
    lines: { label: string; amount: string; muted: boolean }[];
    result: { label: 'Balance due' | 'Paid in full' | 'Refund due to you'; amount: string; tone: Tone; note?: string };
  };
  /** Signed: > 0 = Client owes, < 0 = refund due. */
  balance: INR;
  /** Only when balance > 0 and bank or UPI is filled. `qr` = the UPI URI to encode. */
  payment?: { bank: string[]; upiId?: string; qr?: { uri: string; caption: string } };
  terms: string[];
  signature?: { image: string; caption: string };
  footer: string[];
  filenameTitle: string;
};

export type InvoiceInput = {
  booking: Booking;
  client?: Client;
  profile: BusinessProfile;
};

export function invoiceView({ booking, client, profile: raw }: InvoiceInput): InvoiceView {
  if (!booking.invoiceNo || !booking.invoiceDate) throw new Error('The Invoice needs an invoice number: allocate it first.');
  const p = normaliseBusinessProfile(raw);
  const m = bookingMoney(booking);
  const cancelled = m.cancelled;
  const total = m.sellingPrice;
  const balance = m.clientOutstanding;
  const name = p.tradingName;

  const entries = [...booking.clientPayments].sort((a, b) => a.date.localeCompare(b.date));
  const tripDetail = [dateRangeText(booking.travelStart, booking.travelEnd), paxLine(booking.pax)].filter(Boolean).join(' · ');

  const result: InvoiceView['totals']['result'] =
    balance > 0
      ? {
          label: 'Balance due',
          amount: formatINR(balance),
          tone: 'danger',
          note: booking.clientBalanceDueBy ? `by ${formatDate(booking.clientBalanceDueBy)}` : undefined,
        }
      : balance < 0
        ? { label: 'Refund due to you', amount: formatINR(-balance), tone: 'warn' }
        : { label: 'Paid in full', amount: formatINR(0), tone: 'action' };

  const bank = [
    p.accountName,
    p.accountNumber && `A/c ${p.accountNumber}`,
    p.ifsc && `IFSC ${p.ifsc}`,
    p.bankBranch,
  ].filter((l): l is string => Boolean(l));
  const payment =
    balance > 0 && (bank.length > 0 || p.upiId)
      ? {
          bank,
          upiId: p.upiId,
          qr: p.upiId
            ? {
                uri: upiPayUri({ upiId: p.upiId, payee: name, amount: balance, note: booking.invoiceNo }),
                caption: `Scan to pay ${formatINR(balance)}`,
              }
            : undefined,
        }
      : undefined;

  return {
    invoiceNo: booking.invoiceNo,
    dateLine: `Date ${formatDate(booking.invoiceDate)}`,
    bookingLine: `Booking ${booking.bookingNo}`,
    cancelledPill: cancelled,
    cancelledNote: cancelled
      ? `This booking was cancelled${booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt)}` : ''}. The package price of ${formatINR(booking.sellingPrice)} is replaced by the cancellation charge below.`
      : undefined,
    billedTo: {
      name: client?.name ?? '',
      lines: [client?.mobile && displayMobile(client.mobile), client?.email, client?.city].filter((l): l is string => Boolean(l)),
    },
    from: { name, lines: [...textLines(p.address), ...phoneList(p.phones), p.email, p.website].filter((l): l is string => Boolean(l)) },
    item: {
      title: `${cancelled ? 'Cancellation charge' : 'Holiday package'} — ${booking.destination}`,
      detail: tripDetail,
      amount: formatINR(total),
    },
    services: booking.lines.map((l) => ({ type: l.type, description: l.description, dates: dateRangeText(l.start, l.end) || '—' })),
    servicesStruck: cancelled,
    originalPrice: cancelled ? { label: 'Original package price (all services above)', amount: formatINR(booking.sellingPrice) } : undefined,
    totals: {
      lines: [
        { label: cancelled ? 'Cancellation charge' : 'Package price', amount: formatINR(total), muted: false },
        ...entries.map((e) =>
          e.kind === 'Refund'
            ? { label: `Refunded ${formatDate(e.date)} · ${e.mode}`, amount: `+ ${formatINR(e.amount)}`, muted: true }
            : { label: `Received ${formatDate(e.date)} · ${e.mode}`, amount: `− ${formatINR(e.amount)}`, muted: true },
        ),
      ],
      result,
    },
    balance,
    payment,
    terms: textLines(p.invoiceTerms),
    signature: p.signature ? { image: p.signature, caption: name ? `For ${name}` : 'Authorised signatory' } : undefined,
    footer: [name ? `Thank you for travelling with ${name}.` : 'Thank you for travelling with us.', 'This is not a tax invoice.'],
    filenameTitle: `Invoice ${booking.invoiceNo}`,
  };
}

/* -------------------------------- Voucher -------------------------------- */

export type VoucherItem = {
  type: LineType;
  description: string;
  /** `until 20 Dec 2026` when end ≠ start. */
  until?: string;
  notes?: string;
  /** Confirmation no., or `To be confirmed` (pending = amber). */
  confirmation: { text: string; pending: boolean };
};

export type VoucherView = {
  bookingLine: string;
  /** `Issued 1 Nov 2026` (date of generation; not stored). */
  issuedLine: string;
  guest: { name: string; lines: string[]; travellers?: string };
  trip: { destination: string; dates: string; pax: string };
  /** Business emergency contacts, else business phones; empty = column hidden. */
  emergency: string[];
  /** Dated lines grouped by start date (sorted). */
  days: { date: ISODate; label: string; items: VoucherItem[] }[];
  /** Lines without a start date ("Throughout your trip"). */
  throughout: VoucherItem[];
  itinerary: string[];
  goodToKnow: string[];
  /** `<trading name> · phones · email · website` (filled only); empty = no footer. */
  footer: string;
  filenameTitle: string;
};

export type VoucherInput = {
  booking: Booking;
  client?: Client;
  profile: BusinessProfile;
  /** Issue date (IST today). */
  today: ISODate;
};

const DAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (date: ISODate) => {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${DAY_MONTHS[m - 1]}`;
};

export function voucherView({ booking, client, profile: raw, today }: VoucherInput): VoucherView {
  if (booking.status === 'Cancelled') throw new Error('No Voucher for a cancelled booking.');
  const p = normaliseBusinessProfile(raw);

  // Customer-facing fields only: never dmcId, netCost, dmcPayBy or charges.
  const item = (l: Booking['lines'][number]): VoucherItem => ({
    type: l.type,
    description: l.description,
    until: l.start && l.end && l.end !== l.start ? `until ${formatDate(l.end)}` : undefined,
    notes: l.voucherNotes?.trim() || undefined,
    confirmation: l.confirmationNo?.trim() ? { text: l.confirmationNo.trim(), pending: false } : { text: 'To be confirmed', pending: true },
  });

  const dated = booking.lines
    .filter((l) => l.start)
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.start!.localeCompare(b.l.start!) || a.i - b.i);
  const days: VoucherView['days'] = [];
  for (const { l } of dated) {
    const last = days[days.length - 1];
    if (last && last.date === l.start) last.items.push(item(l));
    else days.push({ date: l.start!, label: dayLabel(l.start!), items: [item(l)] });
  }

  const emergency = textLines(p.emergencyContacts);
  return {
    bookingLine: `Booking ${booking.bookingNo}`,
    issuedLine: `Issued ${formatDate(today)}`,
    guest: {
      name: client?.name ?? '',
      lines: client?.mobile ? [displayMobile(client.mobile)] : [],
      travellers: booking.travellerNames.length ? `Travellers: ${booking.travellerNames.join(', ')}` : undefined,
    },
    trip: { destination: booking.destination, dates: dateRangeText(booking.travelStart, booking.travelEnd), pax: paxLine(booking.pax) },
    emergency: emergency.length ? emergency : phoneList(p.phones),
    days,
    throughout: booking.lines.filter((l) => !l.start).map(item),
    // Printed as-is, line by line (blank lines kept as spacing).
    itinerary: booking.itinerary.trim() ? booking.itinerary.trim().split('\n').map((l) => l.trimEnd()) : [],
    goodToKnow: textLines(p.voucherNotes),
    footer: [p.tradingName, ...phoneList(p.phones), p.email, p.website].filter(Boolean).join(' · '),
    filenameTitle: `Travel voucher ${booking.bookingNo}`,
  };
}
