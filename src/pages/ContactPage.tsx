import { MapPin, MessageCircle, Navigation, Phone, UserRound } from 'lucide-react';
import { ContactActions } from '../components/ContactActions';
import { EnquiryForm } from '../components/EnquiryForm';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { business } from '../content/business';
import { useEnquiryParams } from '../hooks/useEnquiryParams';
import { usePageMeta } from '../hooks/usePageMeta';
import { getCallHref, getDirectionsHref, getWhatsAppHref } from '../lib/contactActions';
import './ContactPage.css';

const { address } = business;

export default function ContactPage() {
  usePageMeta({
    title: 'Contact',
    description: `Call, WhatsApp or visit ${business.name} at ${address.line1}, ${address.locality}, ${address.city}. Contact ${business.contactPerson} on ${business.phone.display}.`,
  });
  // ?service=&destination= from "Enquire" links; the enquiry form is prefilled with them.
  const { defaultService, destination } = useEnquiryParams();

  return (
    <>
      <PageHero
        tone="neutral"
        eyebrow="Contact"
        title="Contact Us"
        intro={`Planning a trip or preparing an application? Call or WhatsApp ${business.contactPerson}, or visit the office in ${address.locality}, ${address.city}.`}
      >
        <ContactActions actions={['call', 'whatsapp']} />
      </PageHero>

      <Section labelledBy="contact-details-heading" className="contact-main">
        <div className="contact-main__layout">
          <div className="contact-details">
            <h2 id="contact-details-heading" className="contact-details__title">
              Contact details
            </h2>
            <ul className="contact-details__list">
              <li className="contact-details__item">
                <span className="contact-details__icon" aria-hidden="true">
                  <UserRound strokeWidth={1.75} />
                </span>
                <div>
                  <p className="contact-details__label">Contact person</p>
                  <p className="contact-details__value">{business.contactPerson}</p>
                </div>
              </li>
              <li className="contact-details__item">
                <span className="contact-details__icon" aria-hidden="true">
                  <Phone strokeWidth={1.75} />
                </span>
                <div>
                  <p className="contact-details__label">Phone</p>
                  <a className="contact-details__value contact-details__link" href={getCallHref()}>
                    {business.phone.display}
                  </a>
                </div>
              </li>
              <li className="contact-details__item">
                <span className="contact-details__icon" aria-hidden="true">
                  <MessageCircle strokeWidth={1.75} />
                </span>
                <div>
                  <p className="contact-details__label">WhatsApp</p>
                  <a
                    className="contact-details__value contact-details__link"
                    href={getWhatsAppHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {business.phone.display}
                    <span className="visually-hidden"> on WhatsApp (opens in a new tab)</span>
                  </a>
                </div>
              </li>
              <li className="contact-details__item">
                <span className="contact-details__icon" aria-hidden="true">
                  <MapPin strokeWidth={1.75} />
                </span>
                <div>
                  <p className="contact-details__label">Office</p>
                  <address className="contact-details__value contact-details__address">
                    {business.name}
                    <br />
                    {address.line1}
                    <br />
                    {address.line2}
                    <br />
                    {address.locality}, {address.city}
                    <br />
                    {address.region} {address.postalCode}, {address.country}
                  </address>
                  <a
                    className="btn btn--outline btn--sm contact-details__directions"
                    href={getDirectionsHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation aria-hidden="true" />
                    Get directions
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </div>
              </li>
            </ul>
          </div>

          <div className="contact-main__enquiry">
            <EnquiryForm defaultService={defaultService} destination={destination} sourcePage="/contact" />
          </div>
        </div>
      </Section>
    </>
  );
}
