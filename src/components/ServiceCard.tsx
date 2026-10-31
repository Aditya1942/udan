import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import './ServiceCard.css';

export type ServiceCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Internal path, e.g. "/visa-services" or getEnquireHref({...}). */
  href: string;
  /** Visible link text. Default "Learn more". The title is appended for screen readers. */
  linkLabel?: string;
  /** 'travel' = photography/green accents; 'visa' = Deep Teal, document-style card. */
  tone: 'travel' | 'visa';
  headingLevel?: 'h2' | 'h3' | 'h4';
  className?: string;
};

export function ServiceCard({
  icon: Icon,
  title,
  description,
  href,
  linkLabel = 'Learn more',
  tone,
  headingLevel: Heading = 'h3',
  className,
}: ServiceCardProps) {
  return (
    <article className={['service-card', `service-card--${tone}`, className].filter(Boolean).join(' ')}>
      <div className="service-card__head">
        <span className="service-card__icon" aria-hidden="true">
          <Icon strokeWidth={1.75} />
        </span>
        <Heading className="service-card__title">{title}</Heading>
      </div>
      <p className="service-card__text">{description}</p>
      <Link to={href} className="link-arrow service-card__link">
        {linkLabel}
        <span className="visually-hidden">: {title}</span>
      </Link>
    </article>
  );
}
