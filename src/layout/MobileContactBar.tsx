import { MessageCircle, Phone } from 'lucide-react';
import { getCallHref, getWhatsAppHref } from '../lib/contactActions';
import './MobileContactBar.css';

/** Fixed bottom Call / WhatsApp bar, shown on small screens only. */
export function MobileContactBar() {
  return (
    <nav className="mobile-bar" aria-label="Quick contact">
      <a className="mobile-bar__action mobile-bar__action--call" href={getCallHref()}>
        <Phone aria-hidden="true" />
        Call Us
      </a>
      <a
        className="mobile-bar__action mobile-bar__action--whatsapp"
        href={getWhatsAppHref()}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle aria-hidden="true" />
        WhatsApp<span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </nav>
  );
}
