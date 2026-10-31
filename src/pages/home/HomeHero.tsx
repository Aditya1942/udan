import { Phone } from 'lucide-react';
import { Link } from 'react-router';
import { ResponsiveImage } from '../../components/ResponsiveImage';
import { business, photos } from '../../content/business';
import { routes } from '../../content/navigation';
import { getCallHref } from '../../lib/contactActions';

/** Photography-led hero with the page's single <h1>. */
export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__media">
        <ResponsiveImage photo={photos.hero} priority />
      </div>
      <div className="container home-hero__inner">
        <div className="home-hero__content">
          <h1 id="home-hero-title" className="home-hero__title">
            {business.tagline}
          </h1>
          <p className="home-hero__lead">
            Holidays, visas, tickets and travel services from {business.address.locality},{' '}
            {business.address.city}.
          </p>
          <div className="home-hero__actions">
            <Link to={routes.tours} className="btn btn--primary">
              Explore tours
            </Link>
            <Link to={routes.visa} className="btn btn--light">
              Explore visa services
            </Link>
          </div>
        </div>

        <aside className="home-hero__contact" aria-label="Speak to UDAN">
          <p>
            <span className="home-hero__contact-label">Speak to {business.contactPerson}</span>
            <a href={getCallHref()} className="home-hero__contact-phone">
              <Phone className="home-hero__contact-icon" aria-hidden="true" strokeWidth={1.75} />
              {business.phone.display}
            </a>
          </p>
        </aside>
      </div>
    </section>
  );
}
