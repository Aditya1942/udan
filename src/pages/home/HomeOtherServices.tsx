import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Section } from '../../components/Section';
import { getService, type ServiceId } from '../../content/business';
import { routes } from '../../content/navigation';

const EXTRAS: readonly ServiceId[] = [
  'hotel-booking', 'flight-train-tickets', 'travel-insurance', 'currency-exchange',
  'corporate-travel',
];

/** Compact strip of the booking/travel-essential services. */
export function HomeOtherServices() {
  return (
    <Section labelledBy="home-extras-title" className="home-extras">
      <div className="home-extras__layout">
        <div className="home-extras__head">
          <h2 id="home-extras-title" className="home-extras__title">
            The Rest of Your Trip, Sorted
          </h2>
          <p className="home-extras__intro">Bookings, travel essentials and business travel, arranged alongside your plans.</p>
          <Link to={routes.otherServices} className="link-arrow">
            See other services
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <ul className="home-extras__list">
          {EXTRAS.map((id) => {
            const { label, description, icon: Icon } = getService(id);
            return (
              <li key={id} className="home-extras__item">
                <span className="home-extras__icon" aria-hidden="true">
                  <Icon strokeWidth={1.75} />
                </span>
                <h3 className="home-extras__label">{label}</h3>
                <p className="home-extras__text">{description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
