import { business, getService, type ServiceId } from '../content/business';
import { buildEnquiryMessage, getCallHref } from '../lib/contactActions';
import { ContactActions } from './ContactActions';
import './InquiryFormSlot.css';

export type InquiryFormSlotProps = {
  /** Service to preselect (from ?service=). */
  defaultService?: ServiceId;
  /** Destination being enquired about (from ?destination=). */
  destination?: string;
  /** Route path the enquiry comes from, e.g. "/" or "/contact". Used by the phase 2 form. */
  sourcePage: string;
  /** Anchor id. Default "enquiry" so /contact#enquiry lands here. */
  id?: string;
};

/**
 * PHASE 1 PLACEHOLDER for the enquiry form.
 * Phase 2 replaces this with the Firestore-backed form using the same props.
 */
export function InquiryFormSlot({ defaultService, destination, sourcePage, id = 'enquiry' }: InquiryFormSlotProps) {
  const serviceLabel =
    defaultService && defaultService !== 'other' ? getService(defaultService).label : undefined;
  const dest = destination?.trim() || undefined;
  const context = [serviceLabel, dest].filter(Boolean).join(' · ');
  const headingId = `${id}-heading`;

  return (
    <div id={id} className="inquiry-slot" data-source-page={sourcePage} role="region" aria-labelledby={headingId}>
      <h2 id={headingId} className="inquiry-slot__title">
        Send us an enquiry
      </h2>
      {context && (
        <p className="inquiry-slot__context">
          <span className="inquiry-slot__context-label">Enquiring about:</span> {context}
        </p>
      )}
      <p className="inquiry-slot__text">
        Our online enquiry form is coming soon. For now, the quickest way to reach us is a call or a
        WhatsApp message to {business.contactPerson} on{' '}
        <a href={getCallHref()} className="inquiry-slot__phone">
          {business.phone.display}
        </a>
        .
      </p>
      <ContactActions layout="stack" actions={['whatsapp']} whatsappText={buildEnquiryMessage({ service: defaultService, destination: dest })} />
    </div>
  );
}
