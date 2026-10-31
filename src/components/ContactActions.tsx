import { MessageCircle, Navigation, Phone } from 'lucide-react';
import { getCallHref, getDirectionsHref, getWhatsAppHref } from '../lib/contactActions';
import './ContactActions.css';

export type ContactAction = 'call' | 'whatsapp' | 'directions';

type ContactActionsProps = {
  /** 'row' = side by side from tablet up (stacked on mobile); 'stack' = always stacked full width. */
  layout?: 'row' | 'stack';
  /** Use on Deep Teal / photo backgrounds: secondary buttons switch to white. */
  onDark?: boolean;
  /** Which actions to show, in order. Default all three. */
  actions?: readonly ContactAction[];
  /** Prefilled WhatsApp message (see buildEnquiryMessage). */
  whatsappText?: string;
  size?: 'md' | 'sm';
  className?: string;
};

const NEW_TAB = <span className="visually-hidden"> (opens in a new tab)</span>;

/** Call Us (primary) / WhatsApp Us / Get Directions buttons. */
export function ContactActions({
  layout = 'row',
  onDark = false,
  actions = ['call', 'whatsapp', 'directions'],
  whatsappText,
  size = 'md',
  className,
}: ContactActionsProps) {
  const secondary = onDark ? 'btn--light' : 'btn--secondary';
  const tertiary = onDark ? 'btn--light' : 'btn--outline';
  const sizeClass = size === 'sm' ? ' btn--sm' : '';

  const render = (action: ContactAction) => {
    switch (action) {
      case 'call':
        return (
          <a key="call" className={`btn btn--primary${sizeClass}`} href={getCallHref()}>
            <Phone aria-hidden="true" />
            Call Us
          </a>
        );
      case 'whatsapp':
        return (
          <a
            key="whatsapp"
            className={`btn ${secondary}${sizeClass}`}
            href={getWhatsAppHref(whatsappText)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" />
            WhatsApp Us
            {NEW_TAB}
          </a>
        );
      case 'directions':
        return (
          <a
            key="directions"
            className={`btn ${tertiary}${sizeClass}`}
            href={getDirectionsHref()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation aria-hidden="true" />
            Get Directions
            {NEW_TAB}
          </a>
        );
    }
  };

  return (
    <div className={['contact-actions', `contact-actions--${layout}`, className].filter(Boolean).join(' ')}>
      {actions.map(render)}
    </div>
  );
}
