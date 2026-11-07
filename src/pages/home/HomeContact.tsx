import { MapPin, Phone, UserRound } from 'lucide-react';
import { ContactActions } from '../../components/ContactActions';
import { EnquiryForm } from '../../components/EnquiryForm';
import { Section, SectionHeading } from '../../components/Section';
import { business } from '../../content/business';
import { getCallHref } from '../../lib/contactActions';

/** Contact details + enquiry. The section is #contact; the enquiry form keeps its default #enquiry id. */
export function HomeContact() {
  const { address } = business;
  return (
    <Section id="contact" labelledBy="home-contact-title" className="home-contact">
      <div className="home-contact__layout">
        <div className="home-contact__details">
          <SectionHeading
            id="home-contact-title"
            eyebrow="Contact"
            title="Let’s Plan Your Journey"
            intro="Call, message or drop by the office. We’re happy to talk through your plans."
          />
          <ul role="list" className="home-contact__facts">
            <li className="home-contact__fact">
              <span className="home-contact__fact-icon" aria-hidden="true">
                <UserRound strokeWidth={1.75} />
              </span>
              <div>
                <p className="home-contact__fact-label">Contact person</p>
                <p className="home-contact__fact-value">{business.contactPerson}</p>
              </div>
            </li>
            <li className="home-contact__fact">
              <span className="home-contact__fact-icon" aria-hidden="true">
                <Phone strokeWidth={1.75} />
              </span>
              <div>
                <p className="home-contact__fact-label">Phone &amp; WhatsApp</p>
                <p className="home-contact__fact-value">
                  <a href={getCallHref()}>{business.phone.display}</a>
                </p>
              </div>
            </li>
            <li className="home-contact__fact">
              <span className="home-contact__fact-icon" aria-hidden="true">
                <MapPin strokeWidth={1.75} />
              </span>
              <div>
                <p className="home-contact__fact-label">Office</p>
                <address className="home-contact__fact-value home-contact__address">
                  {address.line1}
                  <br />
                  {address.line2}
                  <br />
                  {address.locality}, {address.city}, {address.region} {address.postalCode}, {address.country}
                </address>
              </div>
            </li>
          </ul>
          <ContactActions className="home-contact__actions" />
        </div>
        <EnquiryForm sourcePage="/" />
      </div>
    </Section>
  );
}
