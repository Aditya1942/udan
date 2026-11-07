import { ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router';
import { Section, SectionHeading } from '../../components/Section';
import { getService, profile, type ServiceId } from '../../content/business';
import { routes } from '../../content/navigation';
import { getEnquireHref } from '../../lib/contactActions';

const VISA_SERVICES: readonly ServiceId[] = ['visa-services', 'visitor-business-visa', 'passport-services'];

export function HomeVisa() {
  return (
    <Section tone="visa" labelledBy="home-visa-title" className="home-visa">
      <div className="home-visa__layout">
        <div className="home-visa__intro">
          <SectionHeading
            id="home-visa-title"
            eyebrow="Visa & passport"
            title="Guidance for Your Next Step Abroad"
            intro="Applications can feel daunting. We help you understand what's needed, get your documents in order and submit with confidence."
          />
          <p className="home-visa__note">
            <Info aria-hidden="true" />
            <span>
              We guide you through the application and the documents involved. {profile.visaDisclaimer}
            </span>
          </p>
          <Link to={routes.visa} className="btn btn--primary">
            Explore Visa Services
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <ul className="home-visa__list">
          {VISA_SERVICES.map((id) => {
            const { label, description, icon: Icon } = getService(id);
            return (
              <li key={id} className="home-visa__item">
                <span className="home-visa__icon" aria-hidden="true">
                  <Icon strokeWidth={1.75} />
                </span>
                <div className="home-visa__body">
                  <h3 className="home-visa__title">{label}</h3>
                  <p className="home-visa__text">{description}</p>
                  <Link to={getEnquireHref({ service: id })} className="link-arrow">
                    Enquire<span className="visually-hidden"> about {label}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
