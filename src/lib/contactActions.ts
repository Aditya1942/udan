import { business, fullAddress, getService, type ServiceId } from '../content/business';

export type EnquiryContext = {
  service?: ServiceId;
  destination?: string;
};

/** `tel:` link for the business phone. */
export function getCallHref(): string {
  return `tel:${business.phone.e164}`;
}

/** WhatsApp chat link, optionally with prefilled message text. */
export function getWhatsAppHref(text?: string): string {
  const base = `https://wa.me/${business.phone.e164.replace(/^\+/, '')}`;
  const trimmed = text?.trim();
  return trimmed ? `${base}?text=${encodeURIComponent(trimmed)}` : base;
}

/** Google Maps directions to the office address. */
export function getDirectionsHref(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

/** In-app link to the Contact page enquiry section, prefilled via query params. */
export function getEnquireHref({ service, destination }: EnquiryContext = {}): string {
  const params = new URLSearchParams();
  if (service) params.set('service', service);
  const dest = destination?.trim();
  if (dest) params.set('destination', dest);
  const query = params.toString();
  return `/contact${query ? `?${query}` : ''}#enquiry`;
}

/** Friendly first message for WhatsApp, e.g. "Hi UDAN, I'd like to enquire about Visa Services (Dubai)". */
export function buildEnquiryMessage({ service, destination }: EnquiryContext = {}): string {
  const label = service && service !== 'other' ? getService(service).label : undefined;
  const dest = destination?.trim() || undefined;
  if (label && dest) return `Hi UDAN, I'd like to enquire about ${label} (${dest})`;
  if (label || dest) return `Hi UDAN, I'd like to enquire about ${label ?? dest}`;
  return "Hi UDAN, I'd like to make an enquiry";
}
