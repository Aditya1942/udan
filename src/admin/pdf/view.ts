/**
 * Invoice and Voucher view-models (spec: "Documents: Invoice and Voucher PDFs"). Pure: no react-pdf, no Firestore.
 * Every line, label, total and visibility decision the templates print is decided here, so it can be unit-tested;
 * the templates only lay it out. The Business profile prints only filled fields.
 *
 * The Voucher builder never receives DMCs and copies only customer-facing line fields: no DMC name, cost or payment.
 */
import {
  daysBetween,
  divisionOf,
  serviceDates,
  bookingMoney,
  formatDate,
  lineMoney,
  formatINR,
  normaliseBusinessProfile,
  type Booking,
  type BookingCategory,
  type BookingStatus,
  type BusinessProfile,
  type Client,
  type Dmc,
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

/** Entered service dates (never the createdAt fallback) as `dateRangeText` arguments. */
const dateArgs = (b: Parameters<typeof serviceDates>[0]): [ISODate?, ISODate?] => {
  const d = serviceDates(b);
  return [d.start, d.end];
};

/** `18 Dec 2026 – 24 Dec 2026`, or one date when start = end. */
export function dateRangeText(start?: ISODate, end?: ISODate): string {
  if (!start) return '';
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

/** Pax is printed only when entered: with Travel details, or for Immigration (Travellers section). */
const paxText = (b: Booking) => (b.hasTravel || divisionOf(b.category) === 'Immigration' ? paxLine(b.pax) : '');

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


/* ------------------------- shared rich fields ------------------------- */

/** A printed label/value pair (filled values only). */
export type Pair = { label: string; value: string };

const pairs = (rows: [string, string | undefined | false][]): Pair[] =>
  rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));

/** Business identity, split for letterheads and "Issued by" blocks (filled only). */
export type Letterhead = {
  name?: string;
  address: string[];
  phones: string[];
  email?: string;
  website?: string;
};

function letterhead(p: BusinessProfile): Letterhead {
  return { name: p.tradingName, address: textLines(p.address), phones: phoneList(p.phones), email: p.email, website: p.website };
}

/** Bank / UPI rows for a bank-details table (filled only), whatever the balance. */
function bankRows(p: BusinessProfile): Pair[] {
  return pairs([
    ['Account name', p.accountName],
    ['Account no.', p.accountNumber],
    ['IFSC', p.ifsc],
    ['Bank / branch', p.bankBranch],
    ['UPI', p.upiId],
  ]);
}

/** Nights between two dates (0 when either is missing or end <= start). */
export function nightsBetween(start?: ISODate, end?: ISODate): number {
  return start && end && end > start ? daysBetween(start, end) : 0;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const below1000 = (n: number) =>
  n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${below100(n % 100)}` : ''}` : below100(n);

/** `18000` → `Rupees Eighteen Thousand Only` (Indian grouping: crore, lakh, thousand). */
export function inrInWords(amount: INR): string {
  let n = Math.abs(Math.round(amount));
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore >= 1000 ? inrInWords(crore).replace(/^Rupees | Only$/g, '') : below1000(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return `Rupees ${parts.join(' ')} Only`;
}

/** Category → what the booking is, in customer words. */
const CATEGORY_LABEL: Record<BookingCategory, string> = {
  Package: 'Holiday package',
  Hotel: 'Hotel booking',
  Flight: 'Flight tickets',
  Train: 'Train tickets',
  Bus: 'Bus tickets',
  Visa: 'Visa services',
  Passport: 'Passport services',
};

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
  /** The Booking's Contact person: name, number (filled only; empty = not printed). */
  contact: string[];
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

  /* ---- Rich fields for template variants (all optional to print) ---- */
  bookingNo: string;
  /** `1 Nov 2026`. */
  invoiceDate: string;
  category: BookingCategory;
  /** `Holiday package`, `Visa services`… */
  categoryLabel: string;
  status: BookingStatus;
  /** Client address/city/state/country, GSTIN, PAN, WhatsApp… as label/value rows (filled only). */
  billedToDetails: Pair[];
  /** Business identity split into parts. */
  letterhead: Letterhead;
  /** Trip facts (filled only): destination, dates, pax, travellers. */
  trip: { destination: string; dates: string; pax: string; travellers: string[] };
  /** Numbered line items (one per Service line) for itemised layouts; no per-line price exists. */
  lineItems: { no: string; type: LineType; description: string; dates: string; detail: string }[];
  /** Raw totals, formatted. */
  summary: { total: string; received: string; refunded: string; balance: string; inWords: string };
  /** Bank + UPI rows, printed whatever the balance (filled only). */
  bankRows: Pair[];
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
  const tripDetail = [dateRangeText(...dateArgs(booking)), paxText(booking)].filter(Boolean).join(' · ');
  const subject = booking.hasTravel ? booking.destination : (booking.lines[0]?.description ?? '');
  const kind = cancelled ? 'Cancellation charge' : booking.category === 'Package' ? 'Holiday package' : booking.category;

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
    contact: [booking.contactName, booking.contactPhone && displayMobile(booking.contactPhone)].filter((l): l is string => Boolean(l)),
    from: { name, lines: [...textLines(p.address), ...phoneList(p.phones), p.email, p.website].filter((l): l is string => Boolean(l)) },
    item: {
      title: subject ? `${kind} — ${subject}` : kind,
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
    ...richInvoiceFields(booking, client, p),
  };
}

/** The variant-only fields shared by the customer and admin invoices. */
function richInvoiceFields(booking: Booking, client: Client | undefined, p: BusinessProfile) {
  const m = bookingMoney(booking);
  const [start, end] = dateArgs(booking);
  const lineDetail = (l: Booking['lines'][number]) =>
    [
      l.visaType || l.visaCountry ? [l.visaType && `${l.visaType} visa`, l.visaCountry].filter(Boolean).join(' · ') : '',
      l.type === 'Hotel' && nightsBetween(l.start, l.end) ? `${nightsBetween(l.start, l.end)} night${nightsBetween(l.start, l.end) === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  return {
    bookingNo: booking.bookingNo,
    invoiceDate: booking.invoiceDate ? formatDate(booking.invoiceDate) : '',
    category: booking.category,
    categoryLabel: CATEGORY_LABEL[booking.category],
    status: booking.status,
    billedToDetails: pairs([
      ['Mobile', client?.mobile && displayMobile(client.mobile)],
      ['WhatsApp', client?.whatsapp && displayMobile(client.whatsapp)],
      ['Email', client?.email],
      ['Address', [client?.address, client?.city, client?.state, client?.country].filter(Boolean).join(', ')],
      ['GSTIN', client?.gstin],
      ['PAN', client?.pan],
      ['Contact person', booking.contactName],
      ['Contact no.', booking.contactPhone && displayMobile(booking.contactPhone)],
    ]),
    letterhead: letterhead(p),
    trip: {
      destination: booking.hasTravel ? booking.destination : '',
      dates: dateRangeText(start, end),
      pax: paxText(booking),
      travellers: booking.travellerNames,
    },
    lineItems: booking.lines.map((l, i) => ({
      no: String(i + 1).padStart(2, '0'),
      type: l.type,
      description: l.description,
      dates: dateRangeText(l.start, l.end),
      detail: lineDetail(l),
    })),
    summary: {
      total: formatINR(m.sellingPrice),
      received: formatINR(m.clientPaid),
      refunded: formatINR(m.clientRefunded),
      balance: formatINR(m.clientOutstanding),
      inWords: inrInWords(m.sellingPrice),
    },
    bankRows: bankRows(p),
  };
}

/* ----------------------------- Admin invoice ----------------------------- */

/**
 * Internal copy of the invoice for UDAN's own records: everything the customer invoice prints plus the business side —
 * DMC per line, net costs, commission and margin, DMC payments and what is still owed either way, pay-by dates and
 * internal notes. Never sent to a customer.
 */
export type AdminInvoiceView = Omit<InvoiceView, 'invoiceNo' | 'invoiceDate' | 'dateLine'> & {
  /** Invoice no., or `Not invoiced yet`. */
  invoiceNo: string;
  invoiceDate: string;
  dateLine: string;
  /** `INTERNAL — NOT FOR CUSTOMER`. */
  internalBanner: string;
  /** `Prepared 20 Nov 2026`. */
  preparedLine: string;
  cancelReason?: string;
  /** Per Service line: who supplies it and what it costs UDAN. */
  costLines: {
    no: string;
    type: LineType;
    description: string;
    dates: string;
    /** DMC name, or `In-house`. */
    supplier: string;
    netCost: string;
    /** Cancelled only: the DMC cancellation charge replacing the net cost. */
    cancellationCharge?: string;
    confirmation: { text: string; pending: boolean };
    /** `Pay by 10 Dec 2026` when set. */
    payBy?: string;
    /** DMC paid / owed on this line from tagged entries (DMC lines only). */
    dmcPaid?: string;
    dmcOwed?: string;
  }[];
  /** Headline business numbers. Commission tone: action (> 0), danger (< 0). */
  profit: {
    sellingPrice: string;
    netCost: string;
    commission: string;
    commissionTone: Tone;
    /** `18.4%` of the selling price; `—` when the price is 0. */
    margin: string;
    clientReceived: string;
    clientOutstanding: string;
    clientOutstandingTone: Tone;
    dmcOutstanding: string;
    dmcOutstandingTone: Tone;
    /** Cash position today: net received from the client − net paid to DMCs. */
    cashInHand: string;
  };
  /** One row per DMC: cost, paid, outstanding (signed label). */
  dmcs: { name: string; contact: string; cost: string; paid: string; outstanding: string; tone: Tone; label: 'Due' | 'Settled' | 'Due back' }[];
  /** Every money movement, oldest first. */
  ledger: { date: string; party: string; direction: 'In' | 'Out'; kind: string; mode: string; ref: string; amount: string }[];
  internalNotes: string[];
};

export type AdminInvoiceInput = InvoiceInput & { dmcs: Dmc[]; today: ISODate };

export function adminInvoiceView({ booking, client, profile, dmcs, today }: AdminInvoiceInput): AdminInvoiceView {
  const invoiced = Boolean(booking.invoiceNo && booking.invoiceDate);
  const base = invoiceView({
    booking: invoiced ? booking : { ...booking, invoiceNo: 'Not invoiced yet', invoiceDate: today },
    client,
    profile,
  });
  const m = bookingMoney(booking);
  const perLine = lineMoneyById(booking);
  const dmcName = (id?: string) => (id ? (dmcs.find((d) => d.id === id)?.name ?? 'Unknown DMC') : 'In-house');
  const dmcContact = (id: string) => {
    const d = dmcs.find((x) => x.id === id);
    return [d?.contactPerson, d?.phone].filter(Boolean).join(' · ');
  };
  const pct = m.sellingPrice ? `${((m.commission / m.sellingPrice) * 100).toFixed(1)}%` : '—';
  const signedTone = (n: INR, positive: Tone): Tone => (n > 0 ? positive : n < 0 ? 'warn' : 'action');

  const ledger = [
    ...booking.clientPayments.map((e) => ({ e, party: client?.name || 'Client', direction: (e.kind === 'Refund' ? 'Out' : 'In') as 'In' | 'Out' })),
    ...booking.dmcPayments.map((e) => ({ e, party: dmcName(e.dmcId), direction: (e.kind === 'Refund' ? 'In' : 'Out') as 'In' | 'Out' })),
  ]
    .sort((a, b) => a.e.date.localeCompare(b.e.date))
    .map(({ e, party, direction }) => ({
      date: formatDate(e.date),
      party,
      direction,
      kind: e.kind,
      mode: e.mode,
      ref: e.ref ?? '',
      amount: formatINR(e.amount),
    }));
  const dmcNet = booking.dmcPayments.reduce((sum, e) => sum + (e.kind === 'Refund' ? -e.amount : e.amount), 0);

  return {
    ...base,
    invoiceNo: invoiced ? booking.invoiceNo! : 'Not invoiced yet',
    invoiceDate: invoiced ? formatDate(booking.invoiceDate!) : '',
    dateLine: invoiced ? base.dateLine : '',
    internalBanner: 'INTERNAL — NOT FOR CUSTOMER',
    preparedLine: `Prepared ${formatDate(today)}`,
    cancelReason: booking.status === 'Cancelled' ? booking.cancelReason : undefined,
    footer: [`${base.letterhead.name ?? 'UDAN'} · internal booking sheet · ${booking.bookingNo}`, 'Confidential: contains costs and commission. Do not share with the customer.'],
    filenameTitle: `Admin invoice ${booking.bookingNo}`,
    costLines: booking.lines.map((l, i) => {
      const lm = perLine.get(l.id);
      return {
        no: String(i + 1).padStart(2, '0'),
        type: l.type,
        description: l.description,
        dates: dateRangeText(l.start, l.end) || 'Whole trip',
        supplier: dmcName(l.dmcId),
        netCost: formatINR(l.netCost),
        cancellationCharge: m.cancelled ? formatINR(l.dmcCancellationCharge ?? 0) : undefined,
        confirmation: l.confirmationNo?.trim() ? { text: l.confirmationNo.trim(), pending: false } : { text: 'To be confirmed', pending: true },
        payBy: l.dmcPayBy ? `Pay by ${formatDate(l.dmcPayBy)}` : undefined,
        dmcPaid: l.dmcId && lm ? formatINR(lm.dmcPaid) : undefined,
        dmcOwed: l.dmcId && lm?.dmcOwed !== undefined ? formatINR(lm.dmcOwed) : undefined,
      };
    }),
    profit: {
      sellingPrice: formatINR(m.sellingPrice),
      netCost: formatINR(m.netCost),
      commission: formatINR(m.commission),
      commissionTone: m.commission < 0 ? 'danger' : 'action',
      margin: pct,
      clientReceived: formatINR(m.clientNetReceived),
      clientOutstanding: formatINR(m.clientOutstanding),
      clientOutstandingTone: signedTone(m.clientOutstanding, 'danger'),
      dmcOutstanding: formatINR(m.dmcOutstanding),
      dmcOutstandingTone: signedTone(m.dmcOutstanding, 'danger'),
      cashInHand: formatINR(m.clientNetReceived - dmcNet),
    },
    dmcs: m.dmcs.map((d) => ({
      name: dmcName(d.dmcId),
      contact: dmcContact(d.dmcId),
      cost: formatINR(d.cost),
      paid: formatINR(d.netPaid),
      outstanding: formatINR(Math.abs(d.outstanding)),
      tone: d.outstanding > 0 ? 'danger' : d.outstanding < 0 ? 'warn' : 'action',
      label: d.outstanding > 0 ? 'Due' : d.outstanding < 0 ? 'Due back' : 'Settled',
    })),
    ledger,
    internalNotes: textLines(booking.internalNotes),
  };
}

const lineMoneyById = (b: Booking) => new Map(lineMoney(b).map((l) => [l.lineId, l]));

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

  /* ---- Rich fields for template variants ---- */
  /** Voucher no. = Booking ID (`UDN-001`). */
  voucherNo: string;
  bookingNo: string;
  /** `1 Nov 2026`. */
  issueDate: string;
  /** `Confirmed`, `Voucher Received`… (never Cancelled). */
  status: BookingStatus;
  category: BookingCategory;
  categoryLabel: string;
  /** Lead guest + contact as label/value rows (filled only), incl. pax counts and travellers. */
  guestRows: Pair[];
  travellers: string[];
  paxCounts: Pax;
  /** Every Service line, flat, in date order (undated last): for table/card layouts. */
  services: {
    type: LineType;
    description: string;
    /** `12 Nov 2026`; empty when undated. */
    start: string;
    end: string;
    /** Hotels: nights; 0 = n/a. */
    nights: number;
    /** `12 Nov 2026 – 14 Nov 2026`, or `Whole trip`. */
    dates: string;
    notes?: string;
    confirmation: { text: string; pending: boolean };
  }[];
  /** Hotel lines as stays (check-in/out/nights) for hotel-voucher layouts. */
  stays: { name: string; checkIn: string; checkOut: string; nights: number; confirmation: { text: string; pending: boolean }; notes?: string }[];
  /** Business identity for an "Issued by" block. */
  letterhead: Letterhead;
  signature?: { image: string; caption: string };
  /** `2 pending` count of lines still To be confirmed. */
  pendingCount: number;
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
    trip: { destination: booking.hasTravel ? booking.destination : '', dates: dateRangeText(...dateArgs(booking)), pax: paxText(booking) },
    emergency: emergency.length ? emergency : phoneList(p.phones),
    days,
    throughout: booking.lines.filter((l) => !l.start).map(item),
    // Printed as-is, line by line (blank lines kept as spacing).
    itinerary: booking.itinerary.trim() ? booking.itinerary.trim().split('\n').map((l) => l.trimEnd()) : [],
    goodToKnow: textLines(p.voucherNotes),
    footer: [p.tradingName, ...phoneList(p.phones), p.email, p.website].filter(Boolean).join(' · '),
    filenameTitle: `Travel voucher ${booking.bookingNo}`,
    ...richVoucherFields(booking, client, p, today, item),
  };
}

function richVoucherFields(booking: Booking, client: Client | undefined, p: BusinessProfile, today: ISODate, item: (l: Booking['lines'][number]) => VoucherItem) {
  const ordered = booking.lines
    .map((l, i) => ({ l, i }))
    .sort((a, b) => (a.l.start ?? '9999').localeCompare(b.l.start ?? '9999') || a.i - b.i)
    .map(({ l }) => l);
  const pax = paxText(booking);
  return {
    voucherNo: booking.bookingNo,
    bookingNo: booking.bookingNo,
    issueDate: formatDate(today),
    status: booking.status,
    category: booking.category,
    categoryLabel: CATEGORY_LABEL[booking.category],
    guestRows: pairs([
      ['Lead guest', client?.name],
      ['Mobile', client?.mobile && displayMobile(client.mobile)],
      ['Travellers', booking.travellerNames.length ? booking.travellerNames.join(', ') : undefined],
      ['Guests', pax],
    ]),
    travellers: booking.travellerNames,
    paxCounts: booking.pax,
    services: ordered.map((l) => {
      const it = item(l);
      return {
        type: l.type,
        description: l.description,
        start: l.start ? formatDate(l.start) : '',
        end: l.end ? formatDate(l.end) : '',
        nights: l.type === 'Hotel' ? nightsBetween(l.start, l.end) : 0,
        dates: dateRangeText(l.start, l.end) || 'Whole trip',
        notes: it.notes,
        confirmation: it.confirmation,
      };
    }),
    stays: ordered
      .filter((l) => l.type === 'Hotel')
      .map((l) => ({
        name: l.description,
        checkIn: l.start ? formatDate(l.start) : '',
        checkOut: l.end ? formatDate(l.end) : '',
        nights: nightsBetween(l.start, l.end),
        confirmation: item(l).confirmation,
        notes: item(l).notes,
      })),
    letterhead: letterhead(p),
    signature: p.signature ? { image: p.signature, caption: p.tradingName ? `For ${p.tradingName}` : 'Authorised signatory' } : undefined,
    pendingCount: booking.lines.filter((l) => !l.confirmationNo?.trim()).length,
  };
}
