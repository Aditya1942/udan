/**
 * Live document links (`/d/<token>`): what a share doc holds and the message placeholders. Pure (no react-pdf, no
 * Firestore) — the admin routes chunk imports it statically.
 *
 * A share doc stores the customer-safe *view-model* (`invoiceView` / `voucherView`, JSON), never the Booking: those
 * builders already drop DMCs, net cost, commission and internal notes. The admin app rewrites it whenever the
 * Booking, its Client or the Business profile changes (`ShareSync`), so the link always renders current data.
 */
import {
  firstName,
  invoiceFilename,
  voucherFilename,
  type Booking,
  type BusinessProfile,
  type Client,
  type ISODate,
  type MessageVars,
} from '../model';
import { invoiceView, voucherView, type InvoiceView, type VoucherView } from './view';

export type ShareKind = 'invoice' | 'voucher';

/** Bump when the stored view JSON changes shape incompatibly (the public page refuses newer versions). */
export const SHARE_VERSION = 1;

/** Why a link shows no document (still active: it comes back when the reason goes away). */
export type ShareUnavailable = 'cancelled' | 'not-invoiced';

/** The fields of a share doc derived from the Booking (everything except token, kind, booking, template, active). */
export type SharePayload = {
  title: string;
  filename: string;
  tradingName: string;
  /** First business phone, for "call us" on the link page. */
  phone: string;
  /** JSON of the view-model; '' when unavailable. */
  view: string;
  unavailable?: ShareUnavailable;
};

export type ShareInput = {
  kind: ShareKind;
  booking: Booking;
  client?: Client;
  profile: BusinessProfile;
  /** Voucher issue date (the day the link was first shared or re-shared). */
  issuedOn: ISODate;
};

const firstPhone = (p: BusinessProfile) => (p.phones ?? '').split(/[\n,]/).map((s) => s.trim()).find(Boolean) ?? '';

export function sharePayload({ kind, booking, client, profile, issuedOn }: ShareInput): SharePayload {
  const common = { tradingName: profile.tradingName?.trim() ?? '', phone: firstPhone(profile) };
  if (kind === 'invoice') {
    const title = booking.invoiceNo ? `Invoice ${booking.invoiceNo}` : `Invoice for ${booking.bookingNo}`;
    if (!booking.invoiceNo || !booking.invoiceDate) return { ...common, title, filename: '', view: '', unavailable: 'not-invoiced' };
    const view = invoiceView({ booking, client, profile });
    return { ...common, title, filename: invoiceFilename(booking.invoiceNo), view: JSON.stringify(view) };
  }
  const title = `Travel voucher ${booking.bookingNo}`;
  const filename = voucherFilename(booking.bookingNo);
  if (booking.status === 'Cancelled') return { ...common, title, filename, view: '', unavailable: 'cancelled' };
  return { ...common, title, filename, view: JSON.stringify(voucherView({ booking, client, profile, today: issuedOn })) };
}

/** True when a stored share already holds this payload (no write needed). */
export function samePayload(stored: SharePayload, next: SharePayload): boolean {
  return (
    stored.view === next.view &&
    stored.title === next.title &&
    stored.filename === next.filename &&
    stored.tradingName === next.tradingName &&
    stored.phone === next.phone &&
    (stored.unavailable ?? '') === (next.unavailable ?? '')
  );
}

/** Parses a stored view (public page). Throws on bad JSON. */
export function parseShareView(kind: 'invoice', json: string): InvoiceView;
export function parseShareView(kind: 'voucher', json: string): VoucherView;
export function parseShareView(_kind: ShareKind, json: string): InvoiceView | VoucherView {
  return JSON.parse(json) as InvoiceView | VoucherView;
}

function tripText(destination: string, dates: string, fallback: string): string {
  if (destination) return dates ? `${destination} (${dates})` : destination;
  return fallback;
}

/**
 * Placeholder values for the WhatsApp / email message of one document. Status-aware sentences:
 * `paymentLine` (balance due + date / paid in full / refund due) and `pendingLine` (voucher lines To be confirmed).
 */
export function messageVars({ kind, booking, client, profile, today, link }: Omit<ShareInput, 'issuedOn'> & { today: ISODate; link: string }): MessageVars {
  const vars: MessageVars = {
    name: firstName(client?.name ?? ''),
    fullName: client?.name?.trim() ?? '',
    bookingNo: booking.bookingNo,
    invoiceNo: booking.invoiceNo ?? '',
    link,
    tradingName: profile.tradingName?.trim() ?? '',
    phone: firstPhone(profile),
  };
  if (kind === 'invoice' && booking.invoiceNo && booking.invoiceDate) {
    const v = invoiceView({ booking, client, profile });
    const r = v.totals.result;
    vars.trip = tripText(v.trip.destination, v.trip.dates, v.item.title);
    vars.total = v.summary.total;
    vars.balance = v.balance > 0 ? r.amount : '';
    vars.paymentLine =
      r.label === 'Balance due'
        ? `Balance due: ${r.amount}${r.note ? ` ${r.note}` : ''}.${v.payment ? ' Bank and UPI details are on the invoice.' : ''}`
        : r.label === 'Refund due to you'
          ? `Refund due to you: ${r.amount}. We'll be in touch about it.`
          : 'Paid in full. Thank you!';
  } else if (kind === 'voucher' && booking.status !== 'Cancelled') {
    const v = voucherView({ booking, client, profile, today });
    vars.trip = tripText(v.trip.destination, v.trip.dates, v.services[0]?.description || v.categoryLabel);
    const n = v.pendingCount;
    vars.pendingLine = n
      ? `${n} service${n === 1 ? ' is' : 's are'} still being confirmed. This link updates automatically once ${n === 1 ? 'it is' : 'they are'}.`
      : '';
  }
  return vars;
}
