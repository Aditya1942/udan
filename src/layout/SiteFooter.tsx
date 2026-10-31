import { MapPin, Phone, User } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { business } from '../content/business';
import { primaryNav, routes } from '../content/navigation';
import { getCallHref, getDirectionsHref } from '../lib/contactActions';
import './SiteFooter.css';

export function SiteFooter() {
  const { address } = business;
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo variant="onDark" />
          <p>
            Tours, tickets, hotels, travel insurance, currency exchange, and visa and passport
            guidance, all from one office in Ahmedabad.
          </p>
        </div>

        <nav aria-label="Footer" className="site-footer__nav">
          <h2 className="site-footer__heading">Explore</h2>
          <ul role="list">
            {primaryNav.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__contact">
          <h2 className="site-footer__heading">Get in touch</h2>
          <ul role="list">
            <li>
              <User aria-hidden="true" />
              <span>
                <span className="visually-hidden">Contact person: </span>
                {business.contactPerson}
              </span>
            </li>
            <li>
              <Phone aria-hidden="true" />
              <a href={getCallHref()}>{business.phone.display}</a>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <address>
                {address.line1},<br />
                {address.line2},<br />
                {address.locality}, {address.city}, {address.region}, {address.country}
                <br />
                <a href={getDirectionsHref()} target="_blank" rel="noopener noreferrer">
                  Get directions<span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </address>
            </li>
          </ul>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          © {new Date().getFullYear()} {business.name}
        </p>
        <Link to={routes.privacy}>Privacy</Link>
      </div>
    </footer>
  );
}
