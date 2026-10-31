import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { ContactActions } from '../components/ContactActions';
import { PageHero } from '../components/PageHero';
import { Section, SectionHeading, type SectionTone } from '../components/Section';
import { business, getService, type ServiceId } from '../content/business';
import { routes } from '../content/navigation';
import { usePageMeta } from '../hooks/usePageMeta';
import { getEnquireHref } from '../lib/contactActions';
import './OtherServicesPage.css';

type Category = {
  key: string;
  title: string;
  intro: string;
  services: readonly ServiceId[];
  tone: SectionTone;
  cardTone: 'travel' | 'visa';
};

const CATEGORIES: readonly Category[] = [
  {
    key: 'bookings',
    title: 'Stays and tickets',
    intro: 'Hotels, flights and trains arranged for you, for trips within India and abroad.',
    services: ['hotel-booking', 'flight-train-tickets'],
    tone: 'default',
    cardTone: 'travel',
  },
  {
    key: 'before-you-travel',
    title: 'Cover and currency',
    intro: 'Sort out insurance and foreign currency before you set off.',
    services: ['travel-insurance', 'currency-exchange'],
    tone: 'surface',
    cardTone: 'travel',
  },
  {
    key: 'corporate',
    title: 'Corporate travel',
    intro: 'Travel arrangements for companies, from individual trips to group travel.',
    services: ['corporate-travel'],
    tone: 'travel',
    cardTone: 'travel',
  },
  {
    key: 'documents',
    title: 'Passport services',
    intro: 'Passport help sits with our visa guidance, as the two often go together.',
    services: ['passport-services'],
    tone: 'visa',
    cardTone: 'visa',
  },
];

export default function OtherServicesPage() {
  usePageMeta({
    title: 'Other Services',
    description:
      `Hotel booking, flight and train tickets, travel insurance, currency exchange, corporate travel and passport services from ${business.name}, ${business.address.city}.`,
  });

  return (
    <>
      <PageHero
        tone="travel"
        title="The rest of your trip, sorted"
        intro="Beyond tours and visas, UDAN can help with the practical pieces of travel: hotels, tickets, insurance, currency, passports and corporate travel."
      >
        <Link to={getEnquireHref({ service: 'other' })} className="btn btn--primary">
          Send an enquiry
        </Link>
      </PageHero>

      {CATEGORIES.map((category) => {
        const headingId = `other-${category.key}-heading`;
        return (
          <Section
            key={category.key}
            id={category.key}
            tone={category.tone}
            labelledBy={headingId}
            className="other-category"
          >
            <div className="other-category__layout">
              <SectionHeading
                id={headingId}
                title={category.title}
                intro={category.intro}
                className="other-category__heading"
              />
              <div className="other-category__body">
                <ul role="list" className="other-category__cards">
                  {category.services.map((id) => {
                    const { label, description, icon: Icon, highlights } = getService(id);
                    const titleId = `other-service-${id}`;
                    return (
                      <li key={id}>
                        <article
                          aria-labelledby={titleId}
                          className={`other-service other-service--${category.cardTone}`}
                        >
                          <span className="other-service__icon" aria-hidden="true">
                            <Icon strokeWidth={1.75} />
                          </span>
                          <h3 id={titleId} className="other-service__title">
                            {label}
                          </h3>
                          <p className="other-service__text">{description}</p>
                          {highlights.length > 0 && (
                            <>
                              <h4 className="other-service__subtitle">How we help</h4>
                              <ul role="list" className="other-service__list">
                                {highlights.map((item) => (
                                  <li key={item}>
                                    <Check aria-hidden="true" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          <Link to={getEnquireHref({ service: id })} className="link-arrow other-service__link">
                            Enquire
                            <span className="visually-hidden"> about {label}</span>
                          </Link>
                        </article>
                      </li>
                    );
                  })}
                </ul>
                {category.key === 'documents' && (
                  <p className="other-category__crosslink">
                    Applying for a visa as well?{' '}
                    <Link to={`${routes.visa}#passport-services`}>See all visa and passport services</Link>
                  </p>
                )}
              </div>
            </div>
          </Section>
        );
      })}

      <Section tone="teal" labelledBy="other-help-heading">
        <div className="other-help">
          <div className="other-help__text">
            <h2 id="other-help-heading">Not sure which service you need?</h2>
            <p>Tell us about your plans and we’ll guide you to the right help.</p>
          </div>
          <ContactActions onDark actions={['call', 'whatsapp']} />
        </div>
      </Section>
    </>
  );
}
