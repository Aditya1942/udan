/** Enquiry helpers: service labels, Client match by mobile, conversion prefill, filters and counts. */
import { getService, isServiceId } from '../../content/business';
import { formatDate, toISTDate } from './dates';
import type { BookingDraft, Client, Enquiry, EnquiryStatus } from './types';

export function serviceLabel(serviceId: string): string {
  return isServiceId(serviceId) ? getService(serviceId).label : serviceId;
}

/** Exact E.164 match of a mobile against Clients. */
export function matchClientByMobile(clients: readonly Client[], mobile: string): Client | undefined {
  return clients.find((c) => c.mobile === mobile);
}

export type EnquiryConversion = {
  /** Suggested existing Client (Admin confirms or picks another), or undefined → new Client. */
  matchedClient?: Client;
  /** Prefill for a new Client when there is no match. */
  newClient: { name: string; mobile: string };
  /** Booking prefill; status starts Pending and there are no Service Lines. */
  draft: Partial<BookingDraft>;
};

/** Prefill for `/admin/bookings/new?enquiry=<id>`. */
export function enquiryConversion(enquiry: Enquiry, clients: readonly Client[]): EnquiryConversion {
  const matchedClient = matchClientByMobile(clients, enquiry.phone);
  const received = enquiry.createdAt ? formatDate(toISTDate(enquiry.createdAt)) : 'unknown date';
  const message = enquiry.message.trim();
  return {
    matchedClient,
    newClient: { name: enquiry.name, mobile: enquiry.phone },
    draft: {
      clientId: matchedClient?.id,
      destination: enquiry.destination ?? '',
      internalNotes: `From enquiry ${received}: ${serviceLabel(enquiry.service)}${message ? ` — ${message}` : ''}`,
      lines: [],
    },
  };
}

export const ENQUIRY_FILTERS = ['open', 'new', 'contacted', 'converted', 'closed', 'all'] as const;
export type EnquiryFilter = (typeof ENQUIRY_FILTERS)[number];

export function matchesEnquiryFilter(status: EnquiryStatus, filter: EnquiryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return status === 'new' || status === 'contacted';
  return status === filter;
}

export function enquiryCounts(enquiries: readonly Enquiry[]): Record<EnquiryFilter, number> {
  const counts: Record<EnquiryFilter, number> = { open: 0, new: 0, contacted: 0, converted: 0, closed: 0, all: 0 };
  for (const e of enquiries) for (const f of ENQUIRY_FILTERS) if (matchesEnquiryFilter(e.status, f)) counts[f] += 1;
  return counts;
}
