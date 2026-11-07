import { ArrowRight, Info, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { ContactActions } from '../components/ContactActions';
import { PageHero } from '../components/PageHero';
import { Section, SectionHeading } from '../components/Section';
import { business, getService, profile, type ServiceId } from '../content/business';
import { routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildEnquiryMessage, getCallHref, getEnquireHref } from '../lib/contactActions';
import './VisaServicesPage.css';

const VISA_SERVICE_IDS = ['visa-services', 'visitor-business-visa', 'passport-services'] as const satisfies readonly ServiceId[];

function VisaDisclaimer({ className }: { className?: string }) {
  return (
    <aside className={['visa-disclaimer', className].filter(Boolean).join(' ')} aria-label="Important note about visa decisions">
      <Info className="visa-disclaimer__icon" aria-hidden="true" />
      <p>
        <strong>Please note:</strong> {business.shortName} provides guidance and assistance with applications.{' '}
        {profile.visaDisclaimer}
      </p>
    </aside>
  );
}

export default function VisaServicesPage() {
  usePageMeta({
    title: 'Visa Services',
    description:
      `Guidance with visa, visitor and business visitor visa, and passport applications from ${business.name} in ${business.address.locality}, ${business.address.city}.`,
  });

  return (
    <>
      <PageHero
        tone="visa"
        eyebrow="Visa & passport guidance"
        title="Visa Services"
        intro="Clear, practical guidance with visa and passport applications, so you know what's involved and can prepare with confidence."
      >
        <Link to={getEnquireHref({ service: 'visa-services' })} className="btn btn--primary">
          Enquire about a visa
          <ArrowRight aria-hidden="true" />
        </Link>
        <a href={getCallHref()} className="btn btn--outline">
          <Phone aria-hidden="true" />
          Call {business.phone.display}
        </a>
      </PageHero>

      <Section labelledBy="visa-services-heading" className="visa-main">
        <SectionHeading
          id="visa-services-heading"
          eyebrow="How we can help"
          title="Guidance for your next step abroad"
          intro="Choose the service that fits your plans. If you're not sure which one you need, get in touch and we'll point you in the right direction."
        />

        <VisaDisclaimer className="visa-main__disclaimer" />

        <ol className="visa-blocks">
          {VISA_SERVICE_IDS.map((id, index) => {
            const { label, description, icon: Icon, highlights } = getService(id);
            const headingId = `visa-block-${id}`;
            return (
              <li key={id} id={id} className="visa-block">
                <article aria-labelledby={headingId} className="visa-block__inner">
                  <div className="visa-block__head">
                    <span className="visa-block__icon" aria-hidden="true">
                      <Icon strokeWidth={1.75} />
                    </span>
                    <span className="visa-block__index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 id={headingId} className="visa-block__title">
                      {label}
                    </h3>
                  </div>
                  <div className="visa-block__body">
                    <p className="visa-block__text">{description}</p>
                    {highlights.length > 0 && (
                      <>
                        <h4 className="visa-block__subtitle">How we help</h4>
                        <ul className="visa-block__list">
                          {highlights.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <Link to={getEnquireHref({ service: id })} className="btn btn--outline btn--sm visa-block__action">
                      Enquire
                      <span className="visually-hidden"> about {label}</span>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section tone="teal" labelledBy="visa-contact-heading">
        <div className="visa-contact">
          <div className="visa-contact__text">
            <h2 id="visa-contact-heading">Talk to {business.contactPerson} about your application</h2>
            <p>
              Call or WhatsApp to discuss your plans, or visit the office in {business.address.locality},{' '}
              {business.address.city}. We'll explain what's involved and how we can help.
            </p>
          </div>
          <ContactActions onDark whatsappText={buildEnquiryMessage({ service: 'visa-services' })} />
        </div>
      </Section>

      <Section labelledBy="visa-tours-heading" className="visa-tours">
        <div className="visa-tours__inner">
          <div>
            <h2 id="visa-tours-heading" className="visa-tours__title">
              Planning the holiday too?
            </h2>
            <p className="visa-tours__text">
              UDAN can also help with tours, hotels, tickets, travel insurance, currency exchange and corporate travel.
            </p>
          </div>
          <Link to={routes.tours} className="link-arrow visa-tours__link">
            Explore Tours &amp; Packages
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </>
  );
}
